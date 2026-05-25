## What changes

### 1. Commission rules (`src/lib/commission.ts`)
- `foundingCap`: `500` → `5000`
- Add `foundingLockMonths: 24` — founding 50/50 is locked for 24 months from `creator_joined_at`; after that, a former founding creator falls back to the standard tenure ladder (or Power tier if they qualify).
- Add Power Tier activity rule constants:
  - `powerTierGbvThresholdCents` stays £25,000
  - `powerTierMinVideosPer30Days: 1`
  - `powerTierGraceDays: 60`
- Update `resolveSplit()`:
  - Founding → still 50/50, but only while `monthsBetween(joinedAt, bookingAt) < 24`. After 24 months, fall through to power/tenure logic.
  - Power → 50/50 only while still meeting the activity bar (checked via a new input field, see below).

### 2. Database (`supabase/migrations/...`)
- `profiles`: add `power_tier_last_qualified_at timestamptz` (set whenever the nightly check confirms they still meet £25k + 1 video/30d). 60-day grace = power status held until `now() - power_tier_last_qualified_at > 60 days`.
- Rewrite RPC `refresh_creator_tiers()`:
  - For each creator with `power_tier_locked_at`: check rolling-12mo GBV ≥ £25k AND video count in last 30 days ≥ 1. If yes → stamp `power_tier_last_qualified_at = now()`. If no AND grace expired → clear `power_tier_locked_at` (drops them back to tenure tier; next booking re-stamps the split).
  - For creators newly crossing the bar: lock them in as before.
- No backfill — existing 10 test rows already cleared.

### 3. Signup & welcome flow
- `src/routes/welcome.tsx` (creator role picker): add a "What you're signing up for" panel explaining the three earning paths:
  - Founding Creator (first 5,000) — 50/50 for 24 months
  - Power Creator — keep 50/50 forever as long as you post ≥1 video/month AND drive ≥£25k in bookings/yr (60-day grace)
  - Standard tenure ladder: 50/50 first 6mo → 40/60 → 30/70
- `src/lib/email-templates/founding-creator-welcome.tsx`: mention the 24-month lock and the Power Tier path to keep 50/50 after.
- `src/lib/email-templates/creator-tier-unlocked.tsx`: add a "to keep this, stay active: ≥1 video/month, ≥£25k rolling 12mo" line.

### 4. User-facing surfaces
- `src/components/landing/LandingPage.tsx`: update founding counter copy (5,000 cap) and the creator earnings section to show the Power Tier rules.
- `src/routes/legal.creator-agreement.tsx`: codify Founding 24-month lock, Power Tier activity bar, and 60-day grace.
- `src/routes/creator.earnings.tsx`: show the creator their current Power Tier eligibility — videos posted last 30d, rolling-12mo GBV vs £25k, and "next check" date. If on grace, show countdown.
- `src/lib/creator-tier.functions.ts` `getMyCreatorTier`: extend return type with `videosLast30d`, `videosRequired: 1`, `gracePeriodEndsAt` so the earnings page can render it.

### 5. Investor model (`src/lib/investor-model/assumptions.ts`)
- Bump `foundingCap` to 5,000.
- Adjust `tierMixByYear` so founding share decays after 24mo (Year 3+ has near-zero founding, replaced by power/maturing). This recovers most of the £1M margin gap from a flat 5,000 cap.
- `/admin/investor` will recompute automatically.

### Out of scope
- No changes to gross commission %, Stripe fee handling, or business-side commission split.
- No retroactive change to existing redemption rows (they're stamped historically).

## Technical notes
- `resolveSplit` becomes: if isFounding && tenure<24mo → founding; else if powerTierLockedAt && !grace_expired → power; else tenure-based.
- "Grace expired" check uses `power_tier_last_qualified_at` (nullable). Initial lock sets it to `now()`.
- Cron route `/api/public/cron/refresh-creator-tiers` is unchanged at the route level — only the underlying RPC changes.
- Video count = `videos` table rows where `creator_id = ? AND created_at >= now() - 30 days AND status = 'published'` (or equivalent; will verify the videos table column names during build).
