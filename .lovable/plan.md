## Goal

Bring the live Travidz product in line with the v6 TAM/SOM model:
**Tapered 50 → 40 → 30 by tenure**, with a **Power-Creator Tier** (rolling 12-month GBV ≥ £25k locks you at 50% forever), plus a **Founding Creator** flag (first 500 creators locked at 50% for life). The shopper-facing **8% gross commission stays the same** — only the *split* between creator and Travidz changes per booking.

Today the codebase hard-codes a flat 50/50 split via `src/lib/commission.ts` (`creatorPct: 4, platformPct: 4`). Every redemption, payout, agreement page, calculator and email reads from that constant. We need to replace that single constant with a per-creator, per-booking lookup.

---

## 1. Database (migration)

Add the tenure + power-tier state to creators and stamp the resolved split onto every redemption so historical earnings stay correct even when rates change later.

- `profiles`: add `is_founding_creator boolean default false`, `founding_creator_number int null` (rank 1–500), `creator_joined_at timestamptz` (backfill from existing signup), `power_tier_locked_at timestamptz null` (set the first time they cross £25k rolling-12mo GBV — once set, never cleared).
- `deal_redemptions`: add `creator_share_pct numeric(5,2) null`, `platform_share_pct numeric(5,2) null`, `creator_commission_cents int null`, `platform_commission_cents int null`, `creator_tier text null` (`'founding' | 'power' | 'new' | 'maturing' | 'mature'`). Backfill existing rows at 50/50, tier `'new'`.
- `creator_gbv_rolling_12mo` materialised view (creator_id, gbv_cents, refreshed nightly via existing cron) — used to flip `power_tier_locked_at`.
- Trigger `enforce_founding_cap()` that assigns `founding_creator_number` on insert into `profiles` while count < 500.
- Nightly cron (`/api/public/cron/refresh-creator-tiers`) refreshes the view and sets `power_tier_locked_at = now()` for any creator newly above £25k.

## 2. Commission engine

Replace the flat constant with a resolver.

- `src/lib/commission.ts` keeps `totalPct = 8` but exports a new pure function:
  ```ts
  resolveSplit({ joinedAt, isFounding, powerTierLockedAt, bookingAt })
    → { creatorPct, platformPct, tier }
  ```
  Rules: founding or power-tier-locked → 50/50. Otherwise by tenure at `bookingAt`: months 0–6 → 50/50, 7–18 → 40/60 (creator/platform of the 8%), 19+ → 30/70.
- `src/lib/match-codes.server.ts` and `src/routes/api/public/attribute.ts`: when writing a `deal_redemption`, call the resolver with the creator's profile and stamp `creator_share_pct`, `platform_share_pct`, `creator_commission_cents`, `platform_commission_cents`, `creator_tier`.
- All downstream reads (`earnings.functions.ts`, `payouts.functions.ts`, statement CSV, admin payouts page) switch from the hard-coded constant to the per-row `creator_commission_cents`.

## 3. Creator-facing UI

- **`/creator/earnings`** — add a "Your tier" card: shows current tier (Founding / Power / New / Maturing / Mature), current creator share %, rolling-12mo GBV with a progress bar to £25k. If within 6 months of dropping a tier, a banner: *"You're £X away from locking 50% forever."*
- **`/studio` dashboard** — small badge next to the earnings tile mirroring the same tier.
- **`/u/$username`** (own profile only) — Founding Creator badge if applicable.
- **`/creator/analytics`** — annotate the earnings chart with tier transitions.

## 4. Legal & marketing copy

- `src/routes/legal.creator-agreement.tsx` — rewrite the commission section to describe the tapered ladder + power-creator unlock + founding-creator lifetime lock. Include the worked example table from the workbook.
- `src/routes/legal.business-agreement.tsx` — the business-facing copy stays at "flat 8% commission" (businesses don't see the split), but update the 50/50 sentence to *"split between the creator and Travidz; the creator share depends on the creator's tier."*
- `src/routes/business.calculator.tsx` — leave business calc alone (it already shows business-side maths). Add a parallel `/creator/calculator` route that shows creator take-home across the three tenure tiers + power tier.
- Welcome / onboarding (`src/routes/welcome.tsx`, creator agreement screen) — add a "Founding Creator — 50% for life" callout while signups < 500, with a live counter (`500 − founding_creator_number_max`).

## 5. Email templates

- `src/lib/email-templates/redemption-confirmed-creator.tsx` — show the actual creator share % from the redemption row, not the constant.
- New template `creator-tier-unlocked.tsx` — fires when `power_tier_locked_at` is first set ("You're locked at 50% forever — congrats").
- New template `founding-creator-welcome.tsx` — fires on signup if `is_founding_creator = true`.

## 6. Admin tooling

- `src/routes/admin.users.tsx` — show tier + founding number + rolling-12mo GBV per creator; allow manual override of `power_tier_locked_at` (rare-case promotions).
- `src/routes/admin.payouts.tsx` — surface split breakdown per redemption (creator vs platform cents).
- `src/routes/admin.index.tsx` — KPI tile: blended Travidz take-rate this month (should track the workbook's 4.0% → 6.2% glide path).

## 7. Sequencing

1. Migration (tables, view, trigger, cron route).
2. `commission.ts` resolver + attribution rewrite + redemption stamping.
3. Backfill script for existing redemptions (50/50, tier `'new'`).
4. Creator UI (earnings tier card, tier badges).
5. Legal pages + welcome + emails.
6. Admin views.
7. Manual QA: simulate a creator at months 3 / 12 / 24, with and without the power lock, verify the resolver picks the right split and the earnings page reconciles.

## Out of scope (flagged for later)

- Real payouts infrastructure (still "accrual only" per current creator agreement).
- Quarterly leaderboard / featured placement bonus for power creators — workbook keeps this as a Scenario B alternative, not in the v6 default.
- Multi-currency tier thresholds — v6 assumes GBP only.

After approval I'll work through the sequence top-to-bottom in a single build pass and surface the migration first for your sign-off before any code changes ship.
