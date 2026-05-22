## Goal

Bring the live app end-to-end into sync with the v6 financial model already reflected on `/invest` and in `src/lib/investor-model/*`:

- **Gross commission**: 8% → **11%** of GBV
- **Stripe fee** (2.9% + £0.20/txn) deducted from gross commission off the top
- **Net pool** = gross commission − Stripe fee → split per tier
- **Creator tier splits unchanged**: founding/power/new 50%, maturing 40%, mature 30% (now applied to the net pool, not gross)
- Existing redemption rows keep their stamped split (historical correctness via `resolveSplit`)

## Open question (please confirm before I build)

How should the **business-facing commission** be framed?

- **Option A — "11% all-in" (recommended)**: Business sees a single flat 11% deducted; Travidz absorbs the Stripe fee out of its own share. Simplest copy, matches what `/invest` already shows, and what the investor model assumes ("Stripe shared off the top" reduces Travidz + creator net, not what the business pays).
- **Option B — "11% + Stripe pass-through"**: Business sees `11% commission + Stripe processing fees` itemised on their statement. More accurate to wholesale economics but requires extra UI everywhere a business sees a number.

I'll assume **Option A** unless you say otherwise — it matches the v6 model + investor deck wording ("post-Stripe net commission") and only changes Travidz/creator net, not business net.

## Single source of truth

`src/lib/commission.ts`
- `totalPct: 8` → `11`
- Add `stripeVariablePct: 0.029`, `stripeFixedPenceGBP: 20`
- Add helper `computeNetPoolCents(gbvCents)` → `gross − stripeFee` (floor at 0)
- Keep `resolveSplit()` and `splitCommissionCents()` unchanged — they already operate on whatever total you hand them
- Update file header comment to reflect 11% gross / net-pool split

`src/lib/commission.server.ts`
- `stampRedemptionSplit()`: compute `totalCents` from `gbv × 11%`, then subtract Stripe fee → pass net pool into `splitCommissionCents()`
- Persisted columns: `commission_cents` stores gross (11%), new fields stamp the net pool split (already covered by `creator_commission_cents` / `platform_commission_cents`)
- DB schema change: none required (existing columns suffice). Old rows with `commission_rate = 8` continue to settle at 8% (correct historical behaviour).

`src/routes/api/public/attribute.ts`
- `commission_rate: COMMISSION.totalPct` → now writes 11 for new redemptions
- Recomputed `commission_cents` uses 11%

`src/lib/match-codes.server.ts`
- `COMMISSION_PCT` already re-exports `COMMISSION.totalPct` — auto-updates
- Comment "8% commission" → "11% commission"

## Calculators

`src/routes/creator.calculator.tsx`
- Replace hard-coded "8%" copy → use `COMMISSION.totalPct`
- Show two-line breakdown: `Gross commission (11%) − Stripe fee = Net pool` so per-tier numbers reconcile
- Recompute `perBooking` against net pool, not gross

`src/routes/business.calculator.tsx`
- Default `commission` slider 15 → 11; update slider label/help text to "Travidz commission (11%)"
- Copy: "We take 11% and pay you weekly" everywhere

`src/routes/business.deals.new.tsx`
- L62 copy: "We take 8%" → "We take 11%"

## Legal documents

`src/routes/legal.creator-agreement.tsx`
- Replace all hard-coded "8%" / "£40 on £500" with `COMMISSION.totalPct` references
- Update worked example: £500 booking → £55 gross commission − £34.70 Stripe (2.9% × £500 + £0.20) = **£20.30 net pool**, Power Creator gets £10.15, Mature gets £6.09. (Numbers are tiny — see Option A vs B note above; if you'd rather the example look more attractive, we can use a larger ticket where Stripe fee proportionally shrinks, e.g. £2,000.)
- Add a one-paragraph clause explaining Stripe pass-through and that the tier % applies to the **net pool** after payment processing

`src/routes/legal.business-agreement.tsx`
- Already uses `COMMISSION.totalPct` for the headline → auto-updates to 11%
- Update Booking.com worked example: was "£200 → £16 commission → £184 net (vs £164 after 18%)". New: £200 → £22 commission → £178 net (still meaningfully better than £164).
- Update commission display to clarify it's pre-Stripe (Option A) — business net is unchanged at "GBV − 11%"

`src/routes/legal.index.tsx` — verify summary cards don't quote 8%

## User-facing copy / components

Sweep for hard-coded "8%" strings (use `COMMISSION.totalPct` where it's a constant, or update to "11%"):

- `src/routes/business.onboarding.payout.tsx:134` ("8% platform commission")
- `src/components/business/PayoutMethodCard.tsx:51` ("minus an 8% commission")
- `src/lib/email-templates/business-digest.tsx:42` ("commission accrued (8%)")
- `src/routes/welcome.tsx`, `src/routes/notifications.tsx`, `src/routes/support.tsx`, `src/components/feed/VideoCard.tsx`, `src/components/create/SmartDealsSheet.tsx`, `src/components/studio/TagBusinessSheet.tsx`, `src/components/creator/PayoutDetailsForm.tsx`, `src/routes/studio.videos.$id.tsx`, `src/routes/studio.links.tsx`, `src/routes/deals.$id.tsx`, `src/routes/creator.earnings.tsx`, `src/routes/business.invite.$token.tsx`, `src/routes/business.applications.tsx`, `src/routes/business.redemptions.tsx`
- Outreach/email/support copy: `src/lib/outreach.functions.ts`, `src/lib/support.functions.ts`, `src/lib/email-templates/*` (founding-creator-welcome, creator-tier-unlocked, redemption-confirmed-creator)

Strategy: prefer `COMMISSION.totalPct` interpolation for resilience; replace bare "8%" with "11%" where templating isn't worth it (emails).

## Admin / investor pages

- `src/routes/admin.investor.tsx`: hint strings "8%" → "11%" / "gross"
- `src/routes/admin.index.tsx`: any 8% references
- No model changes — `src/lib/investor-model/*` is already on v6

## Out of scope

- DB migration for existing redemptions (historical split is correct as stamped; `commission_rate` already varies per row)
- Pricing for in-flight deals (existing `commission_rate` on deals continues to govern those)
- Visual/design changes
- Re-deriving Stripe pass-through into invoices (Option B work)

## Verification

1. Typecheck passes
2. `/creator/calculator`, `/business/calculator`, `/legal/creator-agreement`, `/legal/business-agreement` render new numbers
3. New redemption (test via attribute endpoint) writes `commission_rate = 11`, `creator_commission_cents` = net-pool × tier%
4. Spot-check 3 user-facing surfaces (welcome, notifications, business onboarding) show 11%
