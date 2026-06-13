import { createFileRoute } from "@tanstack/react-router";
import { checkCronAuth } from "@/lib/cron-auth.server";
import { syncTikTokOfficialAdmin } from "@/lib/social.functions";

/**
 * 6-hourly cron — refresh Travidz's official TikTok feed via the Lovable
 * connector gateway. Auth: Supabase anon key in `apikey` header.
 */
export const Route = createFileRoute("/api/public/cron/sync-tiktok")({
  server: {
    handlers: {
      POST: async ({ request }) => {        const authFail = checkCronAuth(request);
        if (authFail) return authFail;
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