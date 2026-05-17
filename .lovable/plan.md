# Referral redirect + business tracking

Activate the end-to-end pipe so every deal click and redemption is captured cleanly, ready for analytics and (eventually) payout math — without touching banking or money movement.

## What already exists

- `/r/$code` page (client-rendered redirect via `resolveRedirect` serverFn) — works but flashes a loading screen, has no SSR-friendly 302, and doesn't capture `referrer_video_id`.
- `/api/public/d/$id` and `/api/public/go/$id` — already do proper server 302 redirects for deal-id and affiliate-link routes, including `?v=<videoId>` capture and `wrapWithAffiliate` URL wrapping.
- `deal_clicks` table — populated, has trigger to bump `deals.click_count`.
- `deal_redirects` table — auto-populated by `sync_deal_redirect` trigger when a deal application is approved with a code.
- `deal_redemptions` table — **does not exist yet**.

## What we'll build

### 1. Upgrade `/r/$code` to a true server 302

Replace the client-rendered redirect at `src/routes/r.$code.tsx` with a TanStack server route that mirrors the `/api/public/d/$id` pattern:

- Look up code in `deal_redirects` → load `deals` row → validate active/in-window.
- Capture `?v=<videoId>` query param (referrer video) and pass it into the click insert.
- Insert into `deal_clicks` with `deal_id`, `creator_id` (from `deal_redirects`), `referrer_video_id`.
- Wrap final URL with `wrapWithAffiliate` (consistent with `/api/public/d`).
- Return `302` with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
- On unknown code → render a small "link not found" HTML page (200) with a link back to `/`.

Keep the URL `/r/$code` (already shared externally, must not break). Delete `src/lib/redirects.functions.ts:resolveRedirect` once nothing references it; keep `getCreatorClickStats` (used by creator dashboard).

### 2. Create `deal_redemptions` table + RLS

Migration: new table to record confirmed bookings/purchases for commission math.

Columns (domain only):
- `deal_id`, `creator_id`, `user_id` (nullable — anonymous redemptions allowed via business confirmation)
- `code` (the redirect code used, denormalised for audit)
- `order_value_cents` (int, nullable until business confirms)
- `currency` (text, default 'GBP')
- `commission_rate` (numeric, snapshot from deal at time of redemption)
- `commission_cents` (int, computed on confirm)
- `status` enum: `pending` | `confirmed` | `rejected` (default `pending`)
- `confirmed_by` (uuid, business user who confirmed), `confirmed_at`
- `notes` (text, optional)
- standard `id`, `created_at`, `updated_at` + `touch_updated_at` trigger

RLS:
- Travellers: can view their own redemptions (`user_id = auth.uid()`).
- Creators: can view redemptions where `creator_id = auth.uid()` (commission visibility).
- Businesses: can view + update (status, order_value, notes) where `deal.business_id = auth.uid()` via subquery.
- Admins: full access via `has_role(auth.uid(), 'admin')`.
- Insert: server-side only (service role); no client insert policy.

Trigger: on `UPDATE` when `status` transitions to `confirmed`, compute `commission_cents = round(order_value_cents * commission_rate)` if both present.

### 3. Server functions for redemption lifecycle

New file `src/lib/redemptions.functions.ts`:

- `claimRedemption({ code })` — auth required. Traveller-initiated "I used this code" CTA. Inserts a `pending` redemption row (deal_id resolved from `deal_redirects.code`, creator_id from same row, user_id from auth). Idempotent per (user_id, code) within 24h.
- `listBusinessRedemptions({ dealId?, status?, limit, offset })` — auth required, business-scoped via RLS.
- `confirmRedemption({ id, orderValueCents, currency? })` — business sets status `confirmed`, fills order value. Trigger computes commission.
- `rejectRedemption({ id, reason })` — business sets status `rejected`.
- `getCreatorRedemptionStats()` — totals + last-30d counts + pending commission for the authed creator.

All use `requireSupabaseAuth` middleware and `context.supabase` (RLS enforced).

### 4. UI surfaces (small, focused)

- **Deal detail page**: add an "I used this deal" button next to the existing redirect CTA. When clicked, calls `claimRedemption`. Shows a confirmation toast.
- **Business dashboard (`/business`)**: add a "Redemptions" card listing pending rows with inline "Confirm" (prompts for order value) and "Reject" actions. Uses `listBusinessRedemptions`.
- **Creator dashboard**: extend the existing click-stats card with a new "Pending commission" tile using `getCreatorRedemptionStats`. Read-only.

### 5. Verification

- Manual: open `/r/<known-code>` → confirm 302 to wrapped URL, `deal_clicks` row appears with `creator_id` and `referrer_video_id` (if `?v=` present), `deals.click_count` increments.
- Manual: click "I used this deal" → row in `deal_redemptions` (status `pending`). Business confirms → status flips, commission populated. Creator dashboard reflects pending commission.
- Linter: run Supabase linter after migration; resolve any RLS warnings.

## Technical notes

```text
Flow
─────
[user] → /r/CODE?v=<videoId>
              │
              ▼
   server route (302)
              │  insert deal_clicks
              ▼
   wrapWithAffiliate(deal.url) → external supplier

Later
─────
[user] → deal page → "I used this" → claimRedemption()
                                            │
                                            ▼
                            deal_redemptions (pending)
                                            │
[business] → /business → Confirm + £value   │
                                            ▼
                            deal_redemptions (confirmed)
                                            │ trigger
                                            ▼
                            commission_cents computed
```

Files touched:
- `supabase/migrations/<ts>_deal_redemptions.sql` — new table, RLS, trigger
- `src/routes/r.$code.tsx` — **replace** client component with server route (same URL)
- `src/lib/redirects.functions.ts` — remove `resolveRedirect`, keep `getCreatorClickStats`
- `src/lib/redemptions.functions.ts` — **new**
- `src/routes/business.index.tsx` — add redemptions panel
- `src/routes/creator.applications.tsx` or creator dashboard — add commission tile
- Deal detail page — add "I used this" CTA

## Explicitly out of scope

- Stripe Connect, payouts, ledger, invoicing, tax — deferred until banking is ready
- Charts/visualisations — totals only for now
- Disputes / refund flows — `rejected` status is a hard stop, no negotiation UX
- Email notifications on confirm/reject — can layer on later via the existing notifications table
