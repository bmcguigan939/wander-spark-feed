import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---- Defaults --------------------------------------------------------------

const DefaultsInput = z.object({
  default_deliverables: z.array(z.string().min(1).max(120)).max(20).default([]),
  default_comp_room_id: z.string().uuid().nullable().optional(),
  default_nights: z.number().int().min(0).max(60).nullable().optional(),
  default_usage_rights_days: z.number().int().min(0).max(3650).default(90),
  default_commission_pct: z.number().min(0).max(100).default(10),
  brand_dos: z.string().max(2000).nullable().optional(),
  brand_donts: z.string().max(2000).nullable().optional(),
  required_hashtags: z.array(z.string().min(1).max(60)).max(20).default([]),
  required_mentions: z.array(z.string().min(1).max(60)).max(20).default([]),
});

export const RECOMMENDED_DEFAULTS = {
  default_deliverables: [
    "1 short-form video (Reel/TikTok, 15-60s)",
    "3 in-feed photos",
    "1 story set with location tag and swipe-up",
  ],
  default_usage_rights_days: 90,
  default_commission_pct: 10,
  brand_dos:
    "Show the experience authentically. Tag our handle. Use the booking code in caption + bio. Reply to questions in comments.",
  brand_donts:
    "No alcohol or smoking on camera. No competitor mentions. No misleading discount claims. Don't share private staff details.",
  required_hashtags: ["#Travidz"],
  required_mentions: [] as string[],
};

export const getMyCollabDefaults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("business_collab_defaults")
      .select("*")
      .eq("business_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { defaults: data };
  });

export const upsertMyCollabDefaults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DefaultsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await (supabase as any)
      .from("business_collab_defaults")
      .upsert({ business_id: userId, ...data }, { onConflict: "business_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Rules -----------------------------------------------------------------

const RulesInput = z.object({
  auto_accept_enabled: z.boolean().default(false),
  min_followers: z.number().int().min(0).max(10_000_000).default(0),
  min_rolling_gbv_cents: z.number().int().min(0).max(1_000_000_000).default(0),
  require_power_tier: z.boolean().default(false),
  require_verified: z.boolean().default(false),
  max_accepts_per_month: z.number().int().min(1).max(10_000).nullable().optional(),
  max_concurrent_active: z.number().int().min(1).max(10_000).nullable().optional(),
  manual_review_above_followers: z.number().int().min(0).max(100_000_000).nullable().optional(),
  blackout_dates: z.array(z.string().min(8).max(40)).max(200).default([]),
});

export const getMyCollabRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("business_collab_rules")
      .select("*")
      .eq("business_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { rules: data };
  });

export const upsertMyCollabRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RulesInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await (supabase as any)
      .from("business_collab_rules")
      .upsert({ business_id: userId, ...data }, { onConflict: "business_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Accept (one-tap) ------------------------------------------------------

function mintCode(handle: string | null | undefined, dealId: string) {
  const base = (handle ?? "creator").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10) || "CREATOR";
  const suffix = dealId.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${base}${suffix}`;
}

async function ensureCollabThread(args: {
  businessId: string;
  creatorId: string;
  dealId: string;
}) {
  const { businessId, creatorId, dealId } = args;
  const { data: existing } = await supabaseAdmin
    .from("business_threads")
    .select("id")
    .eq("business_id", businessId)
    .eq("creator_id", creatorId)
    .eq("deal_id", dealId)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const [{ data: biz }, { data: deal }] = await Promise.all([
    supabaseAdmin.from("profiles").select("business_name,display_name,username").eq("id", businessId).maybeSingle(),
    supabaseAdmin.from("deals").select("title").eq("id", dealId).maybeSingle(),
  ]);
  const businessName = (biz as any)?.business_name || (biz as any)?.display_name || (biz as any)?.username || "Business";
  const { data: inserted, error } = await supabaseAdmin
    .from("business_threads")
    .insert({
      business_id: businessId,
      creator_id: creatorId,
      deal_id: dealId,
      business_email: `${businessId}@travidz.local`,
      business_name: businessName,
      subject: `Collab approved: ${(deal as any)?.title ?? ""}`.trim(),
      status: "accepted",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return inserted!.id as string;
}

async function acceptApplicationInternal(args: {
  applicationId: string;
  businessId: string;
  auto: boolean;
  reason?: string;
  commissionPctOverride?: number;
}) {
  const { applicationId, businessId, auto, reason, commissionPctOverride } = args;

  const { data: app, error: appErr } = await supabaseAdmin
    .from("deal_applications")
    .select("id,deal_id,creator_id,business_id,status,requested_code,approved_code")
    .eq("id", applicationId)
    .maybeSingle();
  if (appErr) throw new Error(appErr.message);
  if (!app) throw new Error("Application not found");
  if (app.business_id !== businessId) throw new Error("Not your application");
  if (app.status !== "pending") return { ok: true, alreadyDecided: true };

  const [{ data: defaults }, { data: creator }] = await Promise.all([
    supabaseAdmin.from("business_collab_defaults").select("*").eq("business_id", businessId).maybeSingle(),
    supabaseAdmin.from("profiles").select("username").eq("id", app.creator_id).maybeSingle(),
  ]);

  const code = (app.approved_code?.trim() || app.requested_code?.trim() || mintCode((creator as any)?.username, app.deal_id))
    .toUpperCase()
    .slice(0, 40);
  const commission =
    commissionPctOverride ??
    (defaults as any)?.default_commission_pct ??
    10;

  const { error: updErr } = await supabaseAdmin
    .from("deal_applications")
    .update({
      status: "approved",
      approved_code: code,
      commission_pct: commission,
      decided_at: new Date().toISOString(),
      decided_by: businessId,
      auto_decided: auto,
      auto_decision_reason: auto ? reason ?? "rules" : null,
    })
    .eq("id", applicationId);
  if (updErr) throw new Error(updErr.message);

  await ensureCollabThread({
    businessId,
    creatorId: app.creator_id,
    dealId: app.deal_id,
  });

  return { ok: true, code };
}

export const oneTapAcceptApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ applicationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    return acceptApplicationInternal({
      applicationId: data.applicationId,
      businessId: context.userId,
      auto: false,
    });
  });

// ---- Auto-evaluation on new application -----------------------------------

type EvalResult = { accepted: boolean; reason: string };

async function evaluate(args: {
  applicationId: string;
  businessId: string;
  creatorId: string;
}): Promise<EvalResult> {
  const { businessId, creatorId } = args;
  const [{ data: rules }, { data: creator }, { count: followerCount }, { count: monthAccepts }, { count: concurrentActive }] =
    await Promise.all([
      supabaseAdmin.from("business_collab_rules").select("*").eq("business_id", businessId).maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("is_verified,power_tier_locked_at,rolling_12mo_gbv_cents")
        .eq("id", creatorId)
        .maybeSingle(),
      supabaseAdmin.from("follows").select("*", { count: "exact", head: true }).eq("creator_id", creatorId),
      supabaseAdmin
        .from("deal_applications")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "approved")
        .eq("auto_decided", true)
        .gte("decided_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
      supabaseAdmin
        .from("deal_applications")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "approved"),
    ]);

  if (!rules || !(rules as any).auto_accept_enabled) {
    return { accepted: false, reason: "auto-accept off" };
  }
  const r = rules as any;
  const c = (creator ?? {}) as any;
  const followers = followerCount ?? 0;

  if (r.manual_review_above_followers != null && followers >= r.manual_review_above_followers) {
    return { accepted: false, reason: `manual review (followers ≥ ${r.manual_review_above_followers})` };
  }
  if (followers < (r.min_followers ?? 0)) return { accepted: false, reason: "below min followers" };
  if ((c.rolling_12mo_gbv_cents ?? 0) < (r.min_rolling_gbv_cents ?? 0))
    return { accepted: false, reason: "below min rolling GBV" };
  if (r.require_power_tier && !c.power_tier_locked_at) return { accepted: false, reason: "not power tier" };
  if (r.require_verified && !c.is_verified) return { accepted: false, reason: "not verified" };
  if (r.max_accepts_per_month != null && (monthAccepts ?? 0) >= r.max_accepts_per_month)
    return { accepted: false, reason: "monthly cap reached" };
  if (r.max_concurrent_active != null && (concurrentActive ?? 0) >= r.max_concurrent_active)
    return { accepted: false, reason: "concurrent cap reached" };

  return { accepted: true, reason: "auto rules matched" };
}

export async function evaluateCollabApplication(args: {
  applicationId: string;
  businessId: string;
  creatorId: string;
}) {
  try {
    const verdict = await evaluate(args);
    if (!verdict.accepted) return verdict;
    await acceptApplicationInternal({
      applicationId: args.applicationId,
      businessId: args.businessId,
      auto: true,
      reason: verdict.reason,
    });
    return verdict;
  } catch (e: any) {
    return { accepted: false, reason: `error: ${e?.message ?? "unknown"}` };
  }
}

// ---- Public brief by approved_code ----------------------------------------

export const getCollabByCode = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().min(2).max(40) }).parse(input),
  )
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    const { data: app, error } = await supabaseAdmin
      .from("deal_applications")
      .select(
        "id,deal_id,creator_id,business_id,status,approved_code,commission_pct,decided_at,created_at",
      )
      .eq("approved_code", code)
      .eq("status", "approved")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!app) return { collab: null };

    const [{ data: defaults }, { data: deal }, { data: business }, { data: creator }] = await Promise.all([
      supabaseAdmin.from("business_collab_defaults").select("*").eq("business_id", app.business_id).maybeSingle(),
      supabaseAdmin
        .from("deals")
        .select("id,title,image_url,city,country,destination,url,discount_label")
        .eq("id", app.deal_id)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("id,username,display_name,business_name,avatar_url")
        .eq("id", app.business_id)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .eq("id", app.creator_id)
        .maybeSingle(),
    ]);

    return {
      collab: {
        application: app,
        defaults,
        deal,
        business,
        creator,
      },
    };
  });