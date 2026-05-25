import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enforceIpRateLimit } from "@/lib/rate-limit.server";
import { isSelfHost } from "@/lib/url-guards";

// Public click-through for a signed business card on a creator video.
// Logs the click (attributed to the video's creator) and 302-redirects
// to the business's direct website.
export const Route = createFileRoute("/api/public/b/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const limited = await enforceIpRateLimit("public_b_click", request, 120, 60);
        if (limited) return limited;
        const id = params.id;
        if (!/^[0-9a-f-]{36}$/i.test(id)) {
          return new Response("Invalid link", { status: 400 });
        }
        const { data: biz } = await supabaseAdmin
          .from("profiles")
          .select("id,business_name,business_website_url")
          .eq("id", id)
          .maybeSingle();
        if (!biz || !biz.business_website_url) {
          return new Response("Business unavailable", { status: 404 });
        }
        // Defensive: never 302 a user back to one of our own domains —
        // that loops them straight into the feed and looks like the
        // "Book" button did nothing.
        if (isSelfHost(biz.business_website_url)) {
          return new Response("Business unavailable", { status: 404 });
        }

        const u = new URL(request.url);
        const refVideo = u.searchParams.get("v");
        const referrerVideoId =
          refVideo && /^[0-9a-f-]{36}$/i.test(refVideo) ? refVideo : null;

        // Resolve attributed creator from the referrer video.
        let creatorId: string | null = null;
        if (referrerVideoId) {
          const { data: vid } = await supabaseAdmin
            .from("videos")
            .select("creator_id")
            .eq("id", referrerVideoId)
            .maybeSingle();
          creatorId = (vid as any)?.creator_id ?? null;
        }

        supabaseAdmin
          .from("business_clicks")
          .insert({
            business_id: biz.id,
            creator_id: creatorId,
            referrer_video_id: referrerVideoId,
            user_agent: request.headers.get("user-agent"),
          })
          .then(() => {}, () => {});

        // Ensure absolute URL.
        let target = biz.business_website_url.trim();
        if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
        const sep = target.includes("?") ? "&" : "?";
        const finalUrl = `${target}${sep}utm_source=travidz`;

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