import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

    return {
      users, creators, businesses, videosReady, videosPending, videosHidden, dealsActive, appsPending,
      gmv30dCents,
      commission30dCents,
      outstandingLiabilityCents,
      redemptions30d: (r30.data ?? []).length,
      redemptions7d: r7.count ?? 0,
      verifiedBusinesses: verifiedBiz.count ?? 0,
      pendingModerationFlags: pendingFlags.count ?? 0,
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
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("profiles")
      .select("id,username,display_name,avatar_url,created_at,is_verified,verified_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.q) q = q.or(`username.ilike.%${data.q}%,display_name.ilike.%${data.q}%`);
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
