import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { syncYouTubeForUserAdmin } from "@/lib/social.functions";

/**
 * 6-hourly cron — iterate creators with a YouTube handle/channel saved and
 * refresh the latest uploads via YouTube Data API v3 (public).
 *
 * Auth: Supabase anon key in `apikey` header (matches existing cron routes).
 */
export const Route = createFileRoute("/api/public/cron/sync-youtube")({
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

        const { data: rows } = await supabaseAdmin
          .from("profile_socials")
          .select("user_id,youtube_handle,youtube_channel_id")
          .or("youtube_handle.not.is.null,youtube_channel_id.not.is.null")
          .limit(500);

        const results: Array<{
          user_id: string;
          synced: number;
          error: string | null;
        }> = [];
        for (const r of rows ?? []) {
          if (!r.youtube_handle && !r.youtube_channel_id) continue;
          try {
            const res = await syncYouTubeForUserAdmin(r.user_id);
            results.push({ user_id: r.user_id, ...res });
          } catch (e) {
            results.push({
              user_id: r.user_id,
              synced: 0,
              error: (e as Error).message,
            });
          }
        }

        const totalSynced = results.reduce((a, b) => a + b.synced, 0);
        return new Response(
          JSON.stringify({
            ok: true,
            creators: results.length,
            total_synced: totalSynced,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});