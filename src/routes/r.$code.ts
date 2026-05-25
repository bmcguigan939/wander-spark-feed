import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { wrapWithAffiliate } from "@/lib/affiliate-wrapper";
import { enforceIpRateLimit } from "@/lib/rate-limit.server";

// Public referral redirect: /r/CODE[?v=<videoId>]
// Resolves the short code to a deal, logs a click, wraps the URL with
// affiliate tracking, then 302-redirects to the supplier.
export const Route = createFileRoute("/r/$code")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const limited = await enforceIpRateLimit("public_r_click", request, 120, 60);
        if (limited) return limited;
        const code = params.code?.trim().toUpperCase();
        if (!code || code.length > 40) {
          return notFoundResponse(code ?? "");
        }

        const { data: redirect } = await supabaseAdmin
          .from("deal_redirects")
          .select("deal_id,creator_id")
          .eq("code", code)
          .maybeSingle();

        if (!redirect) return notFoundResponse(code);

        const { data: deal } = await supabaseAdmin
          .from("deals")
          .select("id,url,is_active,status,affiliate_network,starts_at,ends_at")
          .eq("id", redirect.deal_id)
          .maybeSingle();

        if (!deal || !deal.is_active || deal.status !== "approved") {
          return notFoundResponse(code);
        }
        const now = Date.now();
        if (deal.starts_at && new Date(deal.starts_at).getTime() > now) {
          return notFoundResponse(code, "This deal hasn’t started yet.");
        }
        if (deal.ends_at && new Date(deal.ends_at).getTime() < now) {
          return notFoundResponse(code, "This deal has expired.");
        }

        const u = new URL(request.url);
        const refVideo = u.searchParams.get("v");
        const referrerVideoId =
          refVideo && /^[0-9a-f-]{36}$/i.test(refVideo) ? refVideo : null;

        // Fire-and-forget click log; trigger increments deals.click_count.
        supabaseAdmin
          .from("deal_clicks")
          .insert({
            deal_id: deal.id,
            creator_id: redirect.creator_id,
            referrer_video_id: referrerVideoId,
          })
          .then(() => {}, () => {});

        const finalUrl = await wrapWithAffiliate(deal.url, deal.affiliate_network);

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

function notFoundResponse(code: string, message?: string) {
  const safeCode = code.replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Link unavailable — Travidz</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; min-height: 100svh; display: grid; place-items: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
      background: #fff8f0; color: #2a1b3d; padding: 24px; text-align: center; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { color: #7a6480; margin: 0 0 24px; max-width: 420px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 6px; }
    a { display: inline-block; background: #ff5a8a; color: white;
      padding: 10px 20px; border-radius: 999px; text-decoration: none;
      font-weight: 600; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>Link unavailable</h1>
    <p>${message ?? "This tracking link is invalid or has been removed."}${safeCode ? ` <br/><small>Code <code>${safeCode}</code></small>` : ""}</p>
    <a href="/">Back to Travidz</a>
  </main>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}