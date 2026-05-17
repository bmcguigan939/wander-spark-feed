import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Refreshes every creator's rolling-12mo GBV and permanently locks any
 * creator newly above £25k into the 50/50 Power Creator tier.
 *
 * Called nightly by pg_cron via the standard apikey pattern.
 */
export const Route = createFileRoute("/api/public/cron/refresh-creator-tiers")({
  server: {
    handlers: {
      POST: async () => {
        const { data, error } = await supabaseAdmin.rpc("refresh_creator_tiers");
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ ok: true, newly_locked: data ?? 0 }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});