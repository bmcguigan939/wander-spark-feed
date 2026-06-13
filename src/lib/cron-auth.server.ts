/**
 * Shared cron / webhook auth guard.
 *
 * Requires the caller to provide `LOVABLE_API_KEY` as `Authorization: Bearer <key>`.
 * `LOVABLE_API_KEY` is a server-only secret (never shipped to the browser), so it's
 * safe to use as the shared secret for pg_cron / external schedulers.
 */
export function checkCronAuth(request: Request): Response | null {
  const expected = process.env.LOVABLE_API_KEY;
  if (!expected) {
    return new Response(
      JSON.stringify({ error: "server_misconfigured" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!provided || provided !== expected) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }
  return null;
}