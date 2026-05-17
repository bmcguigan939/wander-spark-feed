import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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