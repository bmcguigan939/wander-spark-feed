# Notifications + payout-ready earnings ledger

Close the redemption loop so users actually hear about what's happening, and shape the data Stripe will read from on day one of banking — without moving any money.

## What already exists

- `notifications` table with `type` enum, RLS scoped to `user_id`, owner read/update/delete.
- DB triggers already firing for: `like`, `comment`, `reply`, `follow`, `deal_application`, `deal_application_decided`.
- `/notifications` route exists.
- Email infra: `pgmq` queues, `email_send_log`, `suppressed_emails`, `email_unsubscribe_tokens`, `enqueue_email()` RPC, scaffolded auth email templates with brand tokens.
- `deal_redemptions` table with `status` (pending/confirmed/rejected) and `commission_cents` computed by trigger on confirm.

## What's missing

- No notifications when redemptions are confirmed or rejected → creator + traveller never hear back.
- No notification when a deal is expiring → business has no nudge to renew.
- `/notifications` has no header bell / unread badge / grouping.
- No transactional email pipeline wired to events (templates not scaffolded for these).
- No aggregated earnings view — creator dashboard shows pending/confirmed counts but no monthly breakdown, no "payable" concept, nothing Stripe Connect can read on day one.

## Scope

### 1. New notification types + DB triggers

Migration adds enum values + 3 triggers:

- `redemption_confirmed` → notify creator (`user_id = creator_id`) AND traveller (`user_id = redemption.user_id` when not null). Trigger on `deal_redemptions` AFTER UPDATE when `status` transitions to `confirmed`.
- `redemption_rejected` → notify traveller only.
- `deal_expiring_soon` → notify business owner. Driven by a small SQL function called from a daily cron (reuses existing `pg_cron` setup that runs `cron_expire_deals`), scanning `deals` where `ends_at` is between `now()` and `now() + interval '7 days'` and no `deal_expiring_soon` notification exists yet for that deal.

Add `redemption_id` nullable column to `notifications` so the UI can deep-link.

### 2. Notifications UI polish (frontend only)

- Header bell icon with unread count badge (count of `notifications WHERE read_at IS NULL`) — uses Supabase Realtime subscription on `notifications` filtered by `user_id`.
- `/notifications` route: group by day, show actor avatar + relative time + deep link per type (video → `/sounds/$id` or video detail, deal → `/deals/$id`, redemption → `/business/redemptions` or `/creator/analytics`, follow → `/u/$username`).
- "Mark all as read" action (UPDATE `read_at = now()` for current user).
- Empty state.

### 3. Transactional email for the same 3 events

Use the existing `enqueue_email` RPC inside the new triggers to push payloads onto a `transactional_emails` queue. Scaffold three React Email templates under `supabase/functions/_shared/email-templates/`:

- `redemption-confirmed-creator.tsx` — "You earned £X.XX on {deal.title}"
- `redemption-confirmed-traveller.tsx` — "Your booking with {business} is confirmed"
- `deal-expiring.tsx` — "Your deal '{title}' expires in N days"

Each user gets a per-type opt-out via a new `email_preferences` table (`user_id`, `notify_redemption`, `notify_expiry`, `notify_social`, defaults true). Settings page gets a "Email preferences" section. Unsubscribe links use the existing `email_unsubscribe_tokens` flow.

Skip if user is in `suppressed_emails`.

### 4. Payout-ready earnings aggregation

Migration creates a SQL view (no money movement):

```text
creator_earnings_monthly (view)
  creator_id, month (date_trunc),
  redemption_count,
  gross_order_cents,
  commission_cents_total,
  payable_cents   -- sum where status='confirmed' AND confirmed_at < now() - interval '14 days'
  pending_cents   -- sum where status='confirmed' AND confirmed_at >= now() - interval '14 days'
```

RLS: creator reads own rows; admin reads all.

Server fns in `src/lib/earnings.functions.ts`:
- `getCreatorEarningsSummary()` → all-time totals + last 6 months.
- `getCreatorEarningsByMonth({ from, to })` → table rows.
- `getCreatorEarningsByDeal({ month? })` → per-deal contribution.

### 5. Creator earnings page

New route `/creator/earnings`:
- Header KPIs: Lifetime commission, Payable now, Pending clearance, This month.
- Monthly bar chart (last 6 months) — reuse existing chart components if present, else simple CSS bars.
- Table: per-deal contribution for the selected month.
- Banner: "Payouts launch when banking is connected" with a disabled "Connect bank" CTA (placeholder for Stripe Connect phase).

Add a link to it from `/creator/analytics` and from the header user menu.

## Files

- `supabase/migrations/<ts>_notifications_redemptions_and_earnings.sql` — new enum values, triggers, `redemption_id` column, `email_preferences` table + RLS, `creator_earnings_monthly` view + RLS, expiring-deals notification function.
- `supabase/migrations/<ts>_cron_notify_expiring_deals.sql` — pg_cron schedule (separate migration for clarity).
- `supabase/functions/_shared/email-templates/redemption-confirmed-creator.tsx`
- `supabase/functions/_shared/email-templates/redemption-confirmed-traveller.tsx`
- `supabase/functions/_shared/email-templates/deal-expiring.tsx`
- `src/lib/earnings.functions.ts` — new
- `src/lib/notifications.functions.ts` — extend with `markAllRead`, `getUnreadCount`
- `src/lib/email-preferences.functions.ts` — new
- `src/routes/creator.earnings.tsx` — new
- `src/routes/notifications.tsx` — polish
- `src/routes/settings.tsx` — add email preferences section
- `src/components/layout/Header.tsx` (or equivalent) — add notification bell with realtime unread badge

## Explicitly out of scope

- Stripe Connect onboarding, payouts, bank account capture — deferred until banking phase.
- Tax/invoicing/VAT — deferred.
- Push notifications (web push / mobile) — email + in-app only for now.
- Notification digest / batching — every event sends one email.
- Currency conversion — totals shown in GBP only.
- Dispute / clawback flows for confirmed redemptions.

## Verification

- Confirm a `pending` redemption from `/business/redemptions` → creator + traveller see new in-app notification within seconds (realtime); both receive email (check `email_send_log`).
- Reject another → traveller-only notification + email.
- Insert a deal with `ends_at = now() + 3 days`, run the expiry cron manually → business sees notification + email, second run does not duplicate.
- Open `/creator/earnings` as a creator with confirmed redemptions older than 14 days → `payable_cents` populated; newer ones land in `pending_cents`.
- Toggle email preferences off → trigger still creates in-app notification but no email enqueued.
