## Goal
Creators only get paid out at the end of each month, not weekly.

## Current behavior
- A pg_cron job `travidz-generate-payout-drafts-weekly` runs every Monday 08:00 and calls `generate_draft_payout_runs(NULL, NULL, 2000)`, which defaults to "last completed week".
- Creator earnings page says: "We bundle confirmed bookings into weekly runs once you cross the £20 minimum."
- There is no creator-initiated "withdraw" button — payouts are automatic; this is purely a cadence change.

## Changes

### 1. Migration — replace weekly cron with monthly
- `cron.unschedule('travidz-generate-payout-drafts-weekly')`
- `cron.schedule('travidz-generate-payout-drafts-monthly', '0 8 1 * *', ...)` — runs at 08:00 on the 1st of each month.
- Update the SQL call to pass the previous calendar month's start/end explicitly:
  ```sql
  SELECT public.generate_draft_payout_runs(
    (date_trunc('month', now()) - interval '1 month')::date,
    (date_trunc('month', now()) - interval '1 day')::date,
    2000
  );
  ```
  (So on Jul 1 it bundles all confirmed bookings from Jun 1 – Jun 30.)

### 2. UI copy — `src/routes/creator.earnings.tsx`
- Change "We bundle confirmed bookings into weekly runs once you cross the £20 minimum." → "Payouts run at the end of each month. Confirmed bookings ≥ £20 are bundled and paid out on the 1st of the following month."
- If there's any other "weekly" copy on the page or in tooltips, update to "monthly".

### 3. Landing page FAQ (optional, recommended)
- The FAQ "How and when do I get paid?" currently says "Earnings show in your dashboard instantly and you can withdraw to your bank." Tighten to: "Earnings show in your dashboard instantly. Payouts are sent at the end of each month for the prior month's confirmed bookings."

## Out of scope
- No change to `generate_draft_payout_runs` itself, the £20 minimum, the commission split, or admin manual payout flow.
- No new creator-initiated "withdraw now" button (none exists today; payouts are automatic).
- No retroactive change to drafts already generated.

## Open question
Should the £20 minimum stay, or roll unpaid balances into the next month until £20 is reached? Today it just skips the creator that month — I'd keep that behavior unless you say otherwise.
