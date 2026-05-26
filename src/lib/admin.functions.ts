import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isSelfHost } from "@/lib/url-guards";
import { addBlockedIdentities, type Signal } from "@/lib/blocklist.server";

const Role = z.enum(["traveller", "creator", "business", "admin"]);

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

async function logAction(
  adminId: string,
  action: string,
  target_type: string,
  target_id: string,
  notes?: string
) {
  await supabaseAdmin.from("admin_actions").insert({
    admin_id: adminId, action, target_type, target_id, notes,
  });
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const c = (q: any) => q.then((r: any) => r.count ?? 0);
    const [users, creators, businesses, videosReady, videosPending, videosHidden, dealsActive, appsPending] = await Promise.all([
      c(supabaseAdmin.from("profiles").select("id", { count: "exact", head: true })),
      c(supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "creator")),
      c(supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "business")),
      c(supabaseAdmin.from("videos").select("id", { count: "exact", head: true }).eq("status", "ready").eq("is_hidden", false)),
      c(supabaseAdmin.from("videos").select("id", { count: "exact", head: true }).neq("status", "ready")),
      c(supabaseAdmin.from("videos").select("id", { count: "exact", head: true }).eq("is_hidden", true)),
      c(supabaseAdmin.from("deals").select("id", { count: "exact", head: true }).eq("is_active", true)),
      c(supabaseAdmin.from("deal_applications").select("id", { count: "exact", head: true }).eq("status", "pending")),
    ]);

    // KPIs: 30d GMV + commission + 7d/30d redemption volume, outstanding liability, verified business count.
    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const since7 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const [r30, r7, outstanding, verifiedBiz, pendingFlags] = await Promise.all([
      supabaseAdmin
        .from("deal_redemptions")
        .select("order_value_cents,commission_cents")
        .eq("status", "confirmed")
        .gte("confirmed_at", since30),
      supabaseAdmin
        .from("deal_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed")
        .gte("confirmed_at", since7),
      supabaseAdmin
        .from("deal_redemptions")
        .select("commission_cents")
        .eq("status", "confirmed")
        .is("payout_run_id", null),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_verified", true),
      supabaseAdmin
        .from("moderation_flags")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "auto_hidden"]),
    ]);
    const sum = (rows: any[] | null, key: string) =>
      (rows ?? []).reduce((acc, r) => acc + (r[key] ?? 0), 0);
    const gmv30dCents = sum(r30.data as any, "order_value_cents");
    const commission30dCents = sum(r30.data as any, "commission_cents");
    const outstandingLiabilityCents = sum(outstanding.data as any, "commission_cents");

    // Blended Travidz take-rate (30d): platform_commission_cents / order_value_cents.
    // Pulls from the v6 per-row split snapshot. Falls back to 50% of commission
    // when older rows have no split stamped.
    const { data: splitRows } = await supabaseAdmin
      .from("deal_redemptions")
      .select("order_value_cents,commission_cents,platform_commission_cents")
      .eq("status", "confirmed")
      .gte("confirmed_at", since30);
    const platformShare30dCents = (splitRows ?? []).reduce(
      (acc, r: any) =>
        acc +
        (r.platform_commission_cents ?? Math.round((r.commission_cents ?? 0) / 2)),
      0,
    );
    const blendedTakeRate30d =
      gmv30dCents > 0 ? platformShare30dCents / gmv30dCents : 0;
    const { count: powerCreators } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("power_tier_locked_at", "is", null);
    const { count: foundingCreators } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_founding_creator", true);

    return {
      users, creators, businesses, videosReady, videosPending, videosHidden, dealsActive, appsPending,
      gmv30dCents,
      commission30dCents,
      outstandingLiabilityCents,
      redemptions30d: (r30.data ?? []).length,
      redemptions7d: r7.count ?? 0,
      verifiedBusinesses: verifiedBiz.count ?? 0,
      pendingModerationFlags: pendingFlags.count ?? 0,
      blendedTakeRate30d,
      platformShare30dCents,
      powerCreators: powerCreators ?? 0,
      foundingCreators: foundingCreators ?? 0,
    };
  });

export const listAdminVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      filter: z.enum(["all", "pending", "hidden", "featured"]).default("all"),
      q: z.string().max(120).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("videos")
      .select("id,title,status,is_hidden,is_featured,thumbnail_url,like_count,view_count,created_at,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.filter === "pending") q = q.neq("status", "ready");
    if (data.filter === "hidden") q = q.eq("is_hidden", true);
    if (data.filter === "featured") q = q.eq("is_featured", true);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { videos: rows ?? [] };
  });

export const listAdminDeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      filter: z.enum(["all", "active", "inactive"]).default("all"),
      q: z.string().max(120).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("deals")
      .select("id,title,is_active,city,country,destination,image_url,click_count,created_at,business:profiles!deals_business_id_fkey(id,username,display_name)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.filter === "active") q = q.eq("is_active", true);
    if (data.filter === "inactive") q = q.eq("is_active", false);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) {
      // FK alias may not exist; fall back without join
      const { data: r2, error: e2 } = await supabaseAdmin
        .from("deals")
        .select("id,title,is_active,city,country,destination,image_url,click_count,created_at,business_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (e2) throw new Error(e2.message);
      return { deals: r2 ?? [] };
    }
    return { deals: rows ?? [] };
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      q: z.string().max(120).optional(),
      filter: z.enum(["all", "blocked", "flagged"]).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("profiles")
      .select("id,username,display_name,avatar_url,created_at,is_verified,verified_at,is_founding_creator,founding_creator_number,power_tier_locked_at,rolling_12mo_gbv_cents,creator_joined_at,business_name,business_website_url,is_blocked,blocked_at,block_reason,pending_admin_review,review_reason,review_match_details")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.q) q = q.or(`username.ilike.%${data.q}%,display_name.ilike.%${data.q}%`);
    if (data.filter === "blocked") q = q.eq("is_blocked", true);
    if (data.filter === "flagged") q = q.eq("pending_admin_review", true);
    const { data: profiles, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roleRows } = ids.length
      ? await supabaseAdmin.from("user_roles").select("user_id,role").in("user_id", ids)
      : { data: [] as Array<{ user_id: string; role: string }> };
    const byUser = new Map<string, string[]>();
    for (const r of roleRows ?? []) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    }
    return {
      users: (profiles ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] })),
    };
  });

export const setBusinessWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      userId: z.string().uuid(),
      businessName: z.string().trim().max(160).nullable().optional(),
      websiteUrl: z.string().trim().max(500).nullable().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: { business_name?: string | null; business_website_url?: string | null } = {};
    if (data.businessName !== undefined) {
      patch.business_name = data.businessName && data.businessName.length > 0 ? data.businessName : null;
    }
    if (data.websiteUrl !== undefined) {
      const raw = (data.websiteUrl ?? "").trim();
      if (raw.length === 0) {
        patch.business_website_url = null;
      } else {
        const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        try {
          new URL(normalized);
        } catch {
          throw new Error("Invalid URL");
        }
        if (isSelfHost(normalized)) {
          throw new Error("Enter the business's own booking website, not a travidz.com URL.");
        }
        patch.business_website_url = normalized;
      }
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logAction(context.userId, "set_business_website", "profile", data.userId, JSON.stringify(patch));
    return { ok: true };
  });

export const setVideoModeration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      videoId: z.string().uuid(),
      hidden: z.boolean().optional(),
      featured: z.boolean().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: {
      moderated_at: string; moderated_by: string;
      is_hidden?: boolean; is_featured?: boolean;
    } = {
      moderated_at: new Date().toISOString(),
      moderated_by: context.userId,
    };
    if (data.hidden !== undefined) patch.is_hidden = data.hidden;
    if (data.featured !== undefined) patch.is_featured = data.featured;
    const { error } = await supabaseAdmin.from("videos").update(patch).eq("id", data.videoId);
    if (error) throw new Error(error.message);
    await logAction(context.userId,
      data.hidden !== undefined ? (data.hidden ? "hide_video" : "unhide_video") : (data.featured ? "feature_video" : "unfeature_video"),
      "video", data.videoId);
    return { ok: true };
  });

export const deleteVideoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ videoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("videos").delete().eq("id", data.videoId);
    if (error) throw new Error(error.message);
    await logAction(context.userId, "delete_video", "video", data.videoId);
    return { ok: true };
  });

export const setDealActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ dealId: z.string().uuid(), active: z.boolean() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("deals").update({ is_active: data.active }).eq("id", data.dealId);
    if (error) throw new Error(error.message);
    await logAction(context.userId, data.active ? "activate_deal" : "deactivate_deal", "deal", data.dealId);
    return { ok: true };
  });

export const deleteDealAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ dealId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("deals").delete().eq("id", data.dealId);
    if (error) throw new Error(error.message);
    await logAction(context.userId, "delete_deal", "deal", data.dealId);
    return { ok: true };
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), role: Role }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    await logAction(context.userId, `grant_${data.role}`, "user", data.userId);
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), role: Role }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.role === "admin") {
      if (data.userId === context.userId) throw new Error("Cannot revoke your own admin role");
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) throw new Error("Cannot remove the last admin");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    await logAction(context.userId, `revoke_${data.role}`, "user", data.userId);
    return { ok: true };
  });

// ============================================================
// Account blocking, deletion, and flagged-signup review
// ============================================================

async function collectSignalsForUser(userId: string): Promise<Signal[]> {
  const signals: Signal[] = [];

  // Auth identity (email / phone)
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (authUser?.user?.email) signals.push({ kind: "email", value: authUser.user.email });
  if (authUser?.user?.phone) signals.push({ kind: "phone", value: authUser.user.phone });

  // Profile (business name / website) + Stripe account
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("business_name,business_website_url,stripe_connect_account_id")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.business_name) signals.push({ kind: "business_name", value: profile.business_name });
  if (profile?.business_website_url) signals.push({ kind: "website", value: profile.business_website_url });
  if ((profile as any)?.stripe_connect_account_id) {
    signals.push({ kind: "stripe_account", value: (profile as any).stripe_connect_account_id });
  }

  // IP / device signals
  const { data: sigs } = await supabaseAdmin
    .from("user_signals")
    .select("kind,raw_value")
    .eq("user_id", userId)
    .limit(50);
  for (const s of sigs ?? []) {
    if (!s.raw_value) continue;
    if (s.kind === "ip" || s.kind === "signup_ip") signals.push({ kind: "ip", value: s.raw_value });
    if (s.kind === "device") signals.push({ kind: "device", value: s.raw_value });
  }
  return signals;
}

async function ensureNotSelfOrLastAdmin(adminId: string, targetId: string) {
  if (adminId === targetId) throw new Error("You cannot block or delete your own account here.");
  const { data: isTargetAdmin } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", targetId)
    .eq("role", "admin")
    .maybeSingle();
  if (isTargetAdmin) {
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) throw new Error("Cannot block or delete the last admin.");
  }
}

export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      userId: z.string().uuid(),
      reason: z.string().min(1).max(500),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await ensureNotSelfOrLastAdmin(context.userId, data.userId);

    // 1. Mark profile blocked
    const { error } = await (supabaseAdmin.from("profiles") as any).update({
      is_blocked: true,
      blocked_at: new Date().toISOString(),
      blocked_by: context.userId,
      block_reason: data.reason,
      pending_admin_review: false,
    }).eq("id", data.userId);
    if (error) throw new Error(error.message);

    // 2. Hide their content + deactivate their deals
    await supabaseAdmin.from("videos").update({ is_hidden: true }).eq("creator_id", data.userId);
    await supabaseAdmin.from("deals").update({ is_active: false }).eq("business_id", data.userId);

    // 3. Capture fingerprints to the blocklist
    const signals = await collectSignalsForUser(data.userId);
    await addBlockedIdentities(signals, data.userId, data.reason, context.userId);

    // 4. Revoke active sessions so the next request signs them out
    try {
      await supabaseAdmin.auth.admin.signOut(data.userId, "global" as any);
    } catch (e) {
      console.error("[blockUser] signOut failed", e);
    }

    await logAction(context.userId, "block_user", "user", data.userId, data.reason);
    return { ok: true };
  });

export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (supabaseAdmin.from("profiles") as any).update({
      is_blocked: false,
      blocked_at: null,
      blocked_by: null,
      block_reason: null,
    }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logAction(context.userId, "unblock_user", "user", data.userId);
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      userId: z.string().uuid(),
      reason: z.string().min(1).max(500),
      addToBlocklist: z.boolean().default(true),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await ensureNotSelfOrLastAdmin(context.userId, data.userId);

    // Capture fingerprints BEFORE deletion (auth row goes away)
    if (data.addToBlocklist) {
      const signals = await collectSignalsForUser(data.userId);
      await addBlockedIdentities(signals, data.userId, `Deleted: ${data.reason}`, context.userId);
    }

    // Hide content (anonymise rather than hard-delete to keep historical bookings intact)
    await supabaseAdmin.from("videos").update({ is_hidden: true }).eq("creator_id", data.userId);
    await supabaseAdmin.from("deals").update({ is_active: false }).eq("business_id", data.userId);

    // Delete the auth user — profiles row should cascade if FK is set; otherwise fall back.
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (authErr) {
      // If auth deletion fails, mark as blocked instead so admin still has control
      await (supabaseAdmin.from("profiles") as any).update({
        is_blocked: true,
        blocked_at: new Date().toISOString(),
        blocked_by: context.userId,
        block_reason: `Delete failed, blocked instead: ${data.reason}`,
      }).eq("id", data.userId);
      throw new Error(`Auth deletion failed: ${authErr.message}. Account blocked instead.`);
    }
    // Best-effort cleanup of profile row (no-op if cascade already handled it)
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);

    await logAction(context.userId, "delete_user", "user", data.userId, data.reason);
    return { ok: true };
  });

export const approveFlaggedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (supabaseAdmin.from("profiles") as any).update({
      pending_admin_review: false,
      review_reason: null,
      review_match_details: null,
    }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logAction(context.userId, "approve_flagged_user", "user", data.userId);
    return { ok: true };
  });

export const rejectFlaggedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      userId: z.string().uuid(),
      reason: z.string().min(1).max(500),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // Same effect as block, but logged as a rejection of a flagged signup
    await ensureNotSelfOrLastAdmin(context.userId, data.userId);
    await (supabaseAdmin.from("profiles") as any).update({
      is_blocked: true,
      blocked_at: new Date().toISOString(),
      blocked_by: context.userId,
      block_reason: data.reason,
      pending_admin_review: false,
    }).eq("id", data.userId);
    await supabaseAdmin.from("videos").update({ is_hidden: true }).eq("creator_id", data.userId);
    await supabaseAdmin.from("deals").update({ is_active: false }).eq("business_id", data.userId);
    const signals = await collectSignalsForUser(data.userId);
    await addBlockedIdentities(signals, data.userId, `Rejected at review: ${data.reason}`, context.userId);
    try { await supabaseAdmin.auth.admin.signOut(data.userId, "global" as any); } catch {}
    await logAction(context.userId, "reject_flagged_user", "user", data.userId, data.reason);
    return { ok: true };
  });

export const getUserAuditDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const [{ data: signals }, { data: actions }, { data: authUser }] = await Promise.all([
      supabaseAdmin
        .from("user_signals")
        .select("kind,raw_value,seen_at")
        .eq("user_id", data.userId)
        .order("seen_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("admin_actions")
        .select("action,notes,created_at,admin_id")
        .eq("target_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin.auth.admin.getUserById(data.userId),
    ]);
    return {
      email: authUser?.user?.email ?? null,
      phone: authUser?.user?.phone ?? null,
      lastSignInAt: authUser?.user?.last_sign_in_at ?? null,
      signals: signals ?? [],
      actions: actions ?? [],
    };
  });
