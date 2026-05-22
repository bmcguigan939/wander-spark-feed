import { createFileRoute } from "@tanstack/react-router";
import { syncTikTokOfficialAdmin } from "@/lib/social.functions";

/**
 * 6-hourly cron — refresh Travidz's official TikTok feed via the Lovable
 * connector gateway. Auth: Supabase anon key in `apikey` header.
 */
export const Route = createFileRoute("/api/public/cron/sync-tiktok")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("apikey") ?? request.headers.get("Apikey");
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ??
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }
        try {
          const res = await syncTikTokOfficialAdmin();
          return new Response(JSON.stringify({ ok: true, ...res }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});