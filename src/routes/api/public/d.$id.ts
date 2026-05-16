import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { wrapWithAffiliate } from "@/lib/affiliate-wrapper";

// Public click-through for AI-discovered or business deals. Wraps the
// supplier URL with our affiliate tracking + utm_source=travidz, records
// the click, then 302-redirects.
export const Route = createFileRoute("/api/public/d/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = params.id;
        if (!/^[0-9a-f-]{36}$/i.test(id)) {
          return new Response("Invalid link", { status: 400 });
        }
        const { data: deal } = await supabaseAdmin
          .from("deals")
          .select("id,url,is_active,status,affiliate_network,starts_at,ends_at")
          .eq("id", id)
          .maybeSingle();
        if (!deal || !deal.is_active || deal.status !== "approved") {
          return new Response("Deal unavailable", { status: 404 });
        }
        const now = Date.now();
        if (deal.starts_at && new Date(deal.starts_at).getTime() > now) {
          return new Response("Deal not yet live", { status: 404 });
        }
        if (deal.ends_at && new Date(deal.ends_at).getTime() < now) {
          return new Response("Deal expired", { status: 404 });
        }
        const u = new URL(request.url);
        const refVideo = u.searchParams.get("v");
        const referrerVideoId =
          refVideo && /^[0-9a-f-]{36}$/i.test(refVideo) ? refVideo : null;

        const finalUrl = await wrapWithAffiliate(deal.url, deal.affiliate_network);
        supabaseAdmin
          .from("deal_clicks")
          .insert({ deal_id: deal.id, referrer_video_id: referrerVideoId })
          .then(() => {}, () => {});

        return new Response(null, {
          status: 302,
          headers: {
            Location: finalUrl,
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        });
      },
    },
  },
});