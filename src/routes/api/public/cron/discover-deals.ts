import { createFileRoute } from "@tanstack/react-router";
import { runDiscoveryCycle } from "@/lib/discovery.functions";
import { checkCronAuth } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/cron/discover-deals")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFail = checkCronAuth(request);
        if (authFail) return authFail;
        try {
          const out = await runDiscoveryCycle();
          return new Response(JSON.stringify(out), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});