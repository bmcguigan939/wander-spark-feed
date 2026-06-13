import { createFileRoute } from "@tanstack/react-router";
import { checkCronAuth } from "@/lib/cron-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Daily FX rate refresh. Pulls GBP-based rates from frankfurter.dev
 * (ECB reference rates, free, no key) and upserts into public.fx_rates
 * for both GBP->X and X->GBP. Auth: Supabase anon key in `apikey` header.
 */
export const Route = createFileRoute("/api/public/cron/fx-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {        const authFail = checkCronAuth(request);
        if (authFail) return authFail;
        const bases = ["GBP", "USD", "EUR"];
        const rows: Array<{ base: string; quote: string; rate: number; fetched_at: string }> = [];
        const now = new Date().toISOString();

        for (const base of bases) {
          try {
            const r = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}`);
            if (!r.ok) continue;
            const j = (await r.json()) as { rates?: Record<string, number> };
            for (const [quote, rate] of Object.entries(j.rates ?? {})) {
              if (typeof rate !== "number" || !isFinite(rate) || rate <= 0) continue;
              rows.push({ base, quote, rate, fetched_at: now });
            }
          } catch {
            // skip
          }
        }

        if (rows.length) {
          const { error } = await supabaseAdmin
            .from("fx_rates")
            .upsert(rows, { onConflict: "base,quote" });
          if (error) {
            return new Response(
              JSON.stringify({ ok: false, error: error.message }),
              { status: 500, headers: { "content-type": "application/json" } },
            );
          }
        }

        return new Response(
          JSON.stringify({ ok: true, upserted: rows.length }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
