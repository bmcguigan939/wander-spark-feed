import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const resolveRedirect = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().min(1).max(40), userId: z.string().uuid().nullable().optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    const { data: row } = await supabaseAdmin
      .from("deal_redirects")
      .select("deal_id,creator_id")
      .eq("code", code)
      .maybeSingle();
    if (!row) return { url: null as string | null, dealId: null as string | null };

    const { data: deal } = await supabaseAdmin
      .from("deals")
      .select("id,url,is_active,starts_at,ends_at")
      .eq("id", row.deal_id)
      .maybeSingle();
    if (!deal) return { url: null, dealId: null };

    // Fire-and-forget click tracking; ignore errors.
    await supabaseAdmin.from("deal_clicks").insert({
      deal_id: deal.id,
      creator_id: row.creator_id,
      user_id: data.userId ?? null,
    });

    return { url: deal.url, dealId: deal.id };
  });

export const getCreatorClickStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [totalRes, recentRes] = await Promise.all([
      supabaseAdmin
        .from("deal_clicks")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", userId),
      supabaseAdmin
        .from("deal_clicks")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", userId)
        .gte("clicked_at", since),
    ]);
    return { total: totalRes.count ?? 0, last30: recentRes.count ?? 0 };
  });