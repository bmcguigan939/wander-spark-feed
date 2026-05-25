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

/**
 * Best-effort IP key extraction for per-IP rate limiting on public routes.
 * Reads CF-Connecting-IP (Cloudflare), then X-Forwarded-For (first hop),
 * then X-Real-IP. Returns "" if none — caller should treat as no-limit
 * (checkRateLimit also fails open on empty key).
 */
export function getIpKey(request: Request): string {
  const h = request.headers;
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "";
  const xri = h.get("x-real-ip");
  if (xri) return xri.trim();
  return "";
}

/**
 * Convenience: enforce a per-IP rate limit on a public route and return a 429
 * Response if exceeded. Returns null when the call is allowed.
 */
export async function enforceIpRateLimit(
  action: string,
  request: Request,
  maxPerWindow: number,
  windowSeconds: number,
): Promise<Response | null> {
  const ip = getIpKey(request);
  const allowed = await checkRateLimit(action, ip || "unknown", maxPerWindow, windowSeconds);
  if (allowed) return null;
  return new Response("Too many requests", {
    status: 429,
    headers: {
      "Retry-After": String(windowSeconds),
      "Cache-Control": "no-store",
    },
  });
}
