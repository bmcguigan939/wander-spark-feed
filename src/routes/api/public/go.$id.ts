import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/go/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = params.id;
        if (!/^[0-9a-f-]{36}$/i.test(id)) {
          return new Response("Invalid link", { status: 400 });
        }
        const { data: link } = await supabaseAdmin
          .from("affiliate_links")
          .select("url,is_active,video_id")
          .eq("id", id)
          .maybeSingle();
        if (!link || !link.is_active) {
          return new Response("Link unavailable", { status: 404 });
        }

        const url = new URL(request.url);
        const refVideo = url.searchParams.get("v");
        const refVideoId =
          refVideo && /^[0-9a-f-]{36}$/i.test(refVideo) ? refVideo : link.video_id;

        // Fire-and-forget click log; trigger increments click_count
        supabaseAdmin
          .from("affiliate_clicks")
          .insert({ link_id: id, referrer_video_id: refVideoId })
          .then(
            () => {},
            () => {},
          );

        return new Response(null, {
          status: 302,
          headers: {
            Location: link.url,
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        });
      },
    },
  },
});