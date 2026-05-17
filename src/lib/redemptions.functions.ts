import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  enqueueTransactionalEmail,
  formatMoneyGBP,
  getUserEmail,
  SITE_URL,
} from "./email-send.server";
import { RedemptionConfirmedCreatorEmail } from "./email-templates/redemption-confirmed-creator";
import { RedemptionConfirmedTravellerEmail } from "./email-templates/redemption-confirmed-traveller";

// Traveller-initiated "I used this code" claim. Inserts a pending redemption.
// Idempotent: if the same user has already claimed the same code in the last
// 24h, returns the existing row rather than creating a duplicate.
export const claimRedemption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().min(1).max(40) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { checkRateLimit } = await import("@/lib/rate-limit.server");
    const allowed = await checkRateLimit("claim_redemption", userId, 10, 60);
    if (!allowed) return { ok: false as const, error: "Too many attempts — wait a moment." };
    const code = data.code.trim().toUpperCase();

    // Resolve code → deal + creator
    const { data: redirect } = await supabaseAdmin
      .from("deal_redirects")
      .select("deal_id,creator_id")
      .eq("code", code)
      .maybeSingle();
    if (!redirect) {
      return { ok: false as const, error: "Unknown code" };
    }

    // Snapshot commission rate from the approved application (if any)
    const { data: deal } = await supabaseAdmin
      .from("deals")
      .select("id,is_active,status")
      .eq("id", redirect.deal_id)
      .maybeSingle();
    if (!deal || !deal.is_active || deal.status !== "approved") {
      return { ok: false as const, error: "Deal unavailable" };
    }

    const { data: app } = await supabaseAdmin
      .from("deal_applications")
      .select("commission_pct")
      .eq("deal_id", redirect.deal_id)
      .eq("creator_id", redirect.creator_id ?? "")
      .eq("status", "approved")
      .maybeSingle();

    // Idempotency: 24h window
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from("deal_redemptions")
      .select("id,status,created_at")
      .eq("user_id", userId)
      .eq("code", code)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return { ok: true as const, id: existing.id, deduped: true };

    const { data: inserted, error } = await supabaseAdmin
      .from("deal_redemptions")
      .insert({
        deal_id: redirect.deal_id,
        creator_id: redirect.creator_id,
        user_id: userId,
        code,
        commission_rate: app?.commission_pct ?? null,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !inserted) {
      return { ok: false as const, error: error?.message ?? "Insert failed" };
    }
    return { ok: true as const, id: inserted.id, deduped: false };
  });

// Business — list redemptions on their own deals.
export const listBusinessRedemptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dealId: z.string().uuid().optional(),
        status: z.enum(["pending", "confirmed", "rejected"]).optional(),
        limit: z.number().int().min(1).max(100).optional().default(50),
        offset: z.number().int().min(0).optional().default(0),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("deal_redemptions")
      .select(
        "id,deal_id,creator_id,user_id,code,order_value_cents,currency,commission_rate,commission_cents,status,confirmed_at,notes,created_at,deals(title,business_id),profile_user:profiles!deal_redemptions_user_id_fkey(username,display_name),profile_creator:profiles!deal_redemptions_creator_id_fkey(username,display_name)",
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.dealId) q = q.eq("deal_id", data.dealId);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) return { rows: [], error: error.message };
    return { rows: rows ?? [], error: null };
  });

// Business confirms a redemption.
export const confirmRedemption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        orderValueCents: z.number().int().min(0).max(10_000_000),
        currency: z.string().length(3).optional(),
        matchCode: z
          .string()
          .trim()
          .max(40)
          .regex(/^TRAVIDZ-MATCH-[A-Z0-9]+$/i)
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // If a price-match code was supplied, validate it (must exist, not be
    // expired, not already redeemed). Capture matched_price_cents for audit
    // and settlement.
    let matchCode: string | null = null;
    let matchedFromPriceCents: number | null = null;
    if (data.matchCode) {
      const code = data.matchCode.toUpperCase();
      const { data: mc } = await supabaseAdmin
        .from("price_match_codes")
        .select("code,status,expires_at,matched_price_cents,business_id")
        .eq("code", code)
        .maybeSingle();
      if (!mc) return { ok: false as const, error: "Match code not found" };
      if (mc.status === "redeemed")
        return { ok: false as const, error: "Match code already redeemed" };
      if (mc.status === "expired" || new Date(mc.expires_at) < new Date())
        return { ok: false as const, error: "Match code expired" };
      matchCode = mc.code;
      matchedFromPriceCents = mc.matched_price_cents;
    }

    const update = {
      status: "confirmed" as const,
      order_value_cents: data.orderValueCents,
      confirmed_by: userId,
      ...(data.currency ? { currency: data.currency.toUpperCase() } : {}),
      ...(matchCode ? { match_code: matchCode } : {}),
      ...(matchedFromPriceCents != null
        ? { matched_from_price_cents: matchedFromPriceCents }
        : {}),
    };
    const { data: row, error } = await supabase
      .from("deal_redemptions")
      .update(update)
      .eq("id", data.id)
      .select("id,status,commission_cents")
      .single();
    if (error) return { ok: false as const, error: error.message };

    // Flip the price-match code to 'redeemed' so it cannot be re-used and
    // the audit page can show fair settlement.
    if (matchCode) {
      await supabaseAdmin
        .from("price_match_codes")
        .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
        .eq("code", matchCode)
        .eq("status", "issued");
    }

    // Fire-and-forget email notifications (DB triggers already create in-app notifications).
    void sendRedemptionConfirmedEmails(data.id).catch((e) =>
      console.error("redemption emails failed", e),
    );
    return { ok: true as const, row };
  });

// Business rejects a redemption.
export const rejectRedemption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), reason: z.string().max(500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("deal_redemptions")
      .update({ status: "rejected", confirmed_by: userId, notes: data.reason ?? null })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// Creator — pending vs confirmed commission totals.
export const getCreatorRedemptionStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: rows } = await supabaseAdmin
      .from("deal_redemptions")
      .select("status,commission_cents,currency,created_at")
      .eq("creator_id", userId);
    const stats = {
      pendingCount: 0,
      confirmedCount: 0,
      rejectedCount: 0,
      confirmedCommissionCents: 0,
      currency: "GBP" as string,
    };
    for (const r of rows ?? []) {
      if (r.status === "pending") stats.pendingCount++;
      else if (r.status === "rejected") stats.rejectedCount++;
      else if (r.status === "confirmed") {
        stats.confirmedCount++;
        stats.confirmedCommissionCents += r.commission_cents ?? 0;
        if (r.currency) stats.currency = r.currency;
      }
    }
    return stats;
  });

async function sendRedemptionConfirmedEmails(redemptionId: string) {
  const { data: r } = await supabaseAdmin
    .from("deal_redemptions")
    .select(
      "id,deal_id,creator_id,user_id,commission_cents,order_value_cents,deals(title,business_id),creator:profiles!deal_redemptions_creator_id_fkey(display_name,username),traveller:profiles!deal_redemptions_user_id_fkey(display_name,username)",
    )
    .eq("id", redemptionId)
    .maybeSingle();
  if (!r) return;

  const deal = (r as any).deals as { title: string; business_id: string } | null;
  const businessName = deal?.business_id
    ? (
        await supabaseAdmin
          .from("profiles")
          .select("display_name,username")
          .eq("id", deal.business_id)
          .maybeSingle()
      ).data
    : null;
  const businessLabel = businessName?.display_name || businessName?.username || "the business";
  const dealTitle = deal?.title ?? "your booking";
  const dealUrl = `${SITE_URL}/deals/${r.deal_id}`;

  // Creator
  if (r.creator_id) {
    const email = await getUserEmail(r.creator_id);
    if (email) {
      const creator = (r as any).creator as { display_name: string | null; username: string } | null;
      const commission = formatMoneyGBP(r.commission_cents ?? 0);
      const order = formatMoneyGBP(r.order_value_cents ?? 0);
      await enqueueTransactionalEmail({
        to: email,
        subject: `You earned ${commission} on ${dealTitle}`,
        label: "redemption_confirmed_creator",
        userId: r.creator_id,
        category: "redemption",
        idempotencyKey: `redemption-confirmed-creator-${redemptionId}`,
        react: RedemptionConfirmedCreatorEmail({
          creatorName: creator?.display_name || `@${creator?.username ?? "there"}`,
          dealTitle,
          commissionFormatted: commission,
          orderValueFormatted: order,
          earningsUrl: `${SITE_URL}/creator/earnings`,
        }),
      });
    }
  }

  // Traveller (only if a known user, not anonymous)
  if (r.user_id && r.user_id !== r.creator_id) {
    const email = await getUserEmail(r.user_id);
    if (email) {
      const traveller = (r as any).traveller as { display_name: string | null; username: string } | null;
      await enqueueTransactionalEmail({
        to: email,
        subject: `Your booking with ${businessLabel} is confirmed`,
        label: "redemption_confirmed_traveller",
        userId: r.user_id,
        category: "redemption",
        idempotencyKey: `redemption-confirmed-traveller-${redemptionId}`,
        react: RedemptionConfirmedTravellerEmail({
          travellerName: traveller?.display_name || `@${traveller?.username ?? "there"}`,
          businessName: businessLabel,
          dealTitle,
          dealUrl,
        }),
      });
    }
  }
}