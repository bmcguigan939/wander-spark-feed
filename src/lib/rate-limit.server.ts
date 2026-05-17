import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Sliding-window rate limit backed by the rate_limit_hits table.
 * Returns true if the call is allowed (and records a hit); false if exceeded.
 * Fails open (returns true) if the DB call errors — never blocks on infra issues.
 */
export async function checkRateLimit(
  action: string,
  actorKey: string,
  maxPerWindow: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!actorKey) return true;
  try {
    const { data, error } = await (supabaseAdmin.rpc as any)("check_rate_limit", {
      _action: action,
      _actor_key: actorKey,
      _max_per_window: maxPerWindow,
      _window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] error", action, error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.error("[rate-limit] exception", action, e);
    return true;
  }
}
