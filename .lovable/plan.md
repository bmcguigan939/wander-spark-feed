## Goal

Resolve the 2 ERROR-level security findings from the latest scan. Skip the WARN-level rate-limit findings — Lovable's backend has no rate-limiting primitives yet (per platform guidance, those should be ignored at the scanner level rather than implemented ad-hoc).

## Changes

### 1. Realtime channel authorization (ERROR)
**Problem:** `realtime.messages` has no RLS. The `notifications` table is published to Realtime, so any authenticated user can subscribe to another user's notification topic and receive their events.

**Fix (migration):**
- Enable RLS on `realtime.messages`.
- Add policy: authenticated users may only `SELECT` (subscribe) when the topic encodes their own `auth.uid()`. Convention: topic format `notifications:<user_id>`.
- Update client-side notification subscription code (if any) to use the new topic naming. Search: `supabase.channel(` for notification-related subscriptions and align the topic string.

### 2. Open redirect in `createBookingCheckout` (ERROR)
**Problem:** `returnUrl` only validated as `z.string().url()`; passed straight to Stripe `return_url`. Attacker-controlled domains can be used for post-payment phishing.

**Fix (`src/lib/booking.functions.ts`):**
- Add origin allowlist constant: `https://travidz.com`, `https://www.travidz.com`, `https://wander-spark-feed.lovable.app`, plus preview origin pattern `*.lovable.app`.
- After `inputSchema.parse`, validate `new URL(data.returnUrl).origin` against the allowlist; throw if not allowed.
- Allow localhost in non-production for dev only (gated on `process.env.NODE_ENV !== "production"`).

## Skipped (with rationale)

- **`askSupport` no rate limit (WARN)** — platform guidance: do not implement backend rate limiting yet. Will mark the scanner finding as ignored with that reason.
- **`logClientError` no rate limit (WARN)** — same reason; ignore.
- **Other WARNs** (SECURITY DEFINER executable, extensions in public, profiles/deals/affiliate_links column GRANTs, business_invites token, avatar bucket SELECT policy) — already accepted in security memory or downgraded from prior ERRORs.

## Verification

1. Re-run `security--run_security_scan`; expect 0 ERRORs.
2. Manually test booking checkout with a valid origin (passes) and a foreign origin (throws).
3. Confirm notification realtime subscription still delivers events to the owning user only.
