import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { syncOneExternalCalendar } from "@/lib/calendar-sync.server";

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

        const { data: cals, error } = await supabaseAdmin
          .from("deal_external_calendars")
          .select("id");
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

        return Response.json({
          ok: true,
          processed: (cals ?? []).length,
          succeeded: ok,
          failed,
          errors,
        });
      },
    },
  },
});