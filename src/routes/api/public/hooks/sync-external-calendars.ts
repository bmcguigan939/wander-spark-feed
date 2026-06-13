import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  syncBusinessFeed,
  syncOneExternalCalendar,
} from "@/lib/calendar-sync.server";

export const Route = createFileRoute("/api/public/hooks/sync-external-calendars")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // pg_cron uses the standard apikey header pattern. /api/public/* is
        // already unauthenticated at the edge — we just sanity-check the key
        // matches the project's anon key so random callers can't trigger it.
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey") ?? "";
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Per-deal calendars that aren't managed by a business feed.
        const { data: cals, error } = await supabaseAdmin
          .from("deal_external_calendars")
          .select("id")
          .is("business_feed_id", null);
        if (error) {
          console.error("[ical-sync] list failed", error);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        let ok = 0;
        let failed = 0;
        const errors: Array<{ id: string; error: string }> = [];
        for (const c of cals ?? []) {
          const r = await syncOneExternalCalendar(c.id as string);
          if (r.ok) ok += 1;
          else {
            failed += 1;
            errors.push({ id: c.id as string, error: r.error ?? "unknown" });
          }
        }

        // Business-level channel manager feeds (fan out across each owner's deals).
        const { data: feeds, error: feedsErr } = await supabaseAdmin
          .from("business_channel_feeds")
          .select("id");
        if (feedsErr) {
          console.error("[ical-sync] feed list failed", feedsErr);
        }
        let feedsOk = 0;
        let feedsFailed = 0;
        const feedErrors: Array<{ id: string; error: string }> = [];
        for (const f of feeds ?? []) {
          const r = await syncBusinessFeed(f.id as string);
          if (r.ok) feedsOk += 1;
          else {
            feedsFailed += 1;
            feedErrors.push({ id: f.id as string, error: r.error ?? "unknown" });
          }
        }

        return Response.json({
          ok: true,
          processed: (cals ?? []).length,
          succeeded: ok,
          failed,
          errors,
          feedsProcessed: (feeds ?? []).length,
          feedsSucceeded: feedsOk,
          feedsFailed,
          feedErrors,
        });
      },
    },
  },
});