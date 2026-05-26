## Complete operator-pricing items A–F

### A. Operator site embed at signup
- Migration: add `profiles.operator_site_url text` + `profiles.operator_site_host text` (trigger normalises host like the deals trigger).
- `business.signup.tsx`: add a final optional step "Are you an activity operator? Paste your booking page" with a URL input and live `<iframe>` preview (sandbox=`allow-scripts allow-same-origin allow-forms`, `referrerPolicy="no-referrer"`, with a graceful "couldn't embed — that's fine" fallback if the iframe fails to load within 4s using `onError`/`onLoad`).
- Save via existing `upsertBusinessProfile` server fn (extend its Zod schema).
- Prefill `operator_site_url` in `DealForm` for any new `do`/`tour` deal.

### B. Operator deals must be bookable
- `DealForm.tsx`: when `pricing_model === 'operator_markup'`:
  - Force `bookable = true` (hide/disable the toggle, show "Bookable through Travidz — required for the 11% model").
  - Require `cancellation_policy_code`.
  - Block submit if the business has no payout method (`creator_payout_details` or Stripe Connect equivalent).
- Server-side: `upsertDeal` validator rejects `pricing_model='operator_markup' && (!bookable || !operator_base_price_cents)` with a clear error.
- DB CHECK trigger on `deals`: raise if `pricing_model='operator_markup'` and (`bookable IS NOT TRUE` OR `operator_base_price_cents IS NULL`).

### C. Public deal page disclosure
- `deals.$id.tsx`: above the price block, when `pricing_model='operator_markup'`, render:
  - "**£X** — booked through Travidz with [Operator Name]"
  - Small line: "Travidz adds an 11% booking fee on top of the operator's price for secure checkout, support, and creator rewards."
  - Tooltip/link "How we price activities" → `/legal/terms#activity-pricing`.
- Hide the generic "lowest price" microcopy on these deals; `PriceMatchBadge` operator variant already handles the comparison line.

### D. Operator onboarding card
- `OnboardingChecklist.tsx`: add a new card visible when business has `profiles.operator_site_url` set **or** any `do`/`tour` deal. Three checks:
  1. Booking site URL saved on profile.
  2. At least one deal with `pricing_model='operator_markup'` and `operator_base_price_cents` set.
  3. Collab defaults saved (`business_collab_defaults` row exists).
- Each row links to the relevant page (`/business/signup`, `/business/deals/new`, `/business/collabs`).

### E. Legal copy
- `legal.terms.tsx`: add a new sub-section with anchor `id="activity-pricing"`:
  - Defines "third-party resellers" (GetYourGuide, Viator, Klook, Tiqets, Musement, and similar).
  - Discloses 11% Travidz booking fee on operator-markup activities.
  - States we never compare against the operator's own website; price comparisons are scoped to third-party resellers only.
  - Notes the operator may sell direct on their own site.
- `legal.business-agreement.tsx`: add a short paragraph confirming the 11% uplift, that Travidz collects it on top of the operator's base price, and remittance terms.

### F. Operator-correct payout split
- `commission.server.ts` / `stampRedemptionSplit`: branch on `deal.pricing_model`:
  - `commission` (today): unchanged.
  - `operator_markup`: `gross_cents = price_cents`, `commission_cents = price_cents - operator_base_price_cents` (the 11% uplift), `net_cents = operator_base_price_cents`. Creator commission: paid out of the 11% pool only (configurable `default_commission_pct`, default 10% of the uplift to keep creator economics neutral — confirm split before merge).
- `business_payout_lines` insert uses the new values.
- Add a unit-style guard: in dev, log a console error if `pricing_model='operator_markup'` and `operator_base_price_cents` is null at split time (should be prevented by B but defensive).
- Backfill: not needed — no operator-markup bookings exist yet.

### Verification before sign-off
1. Run `supabase--linter` after the new migration — expect no new warnings.
2. Manually create an operator deal in preview, confirm:
   - Trigger sets `price_cents = base × 1.11`.
   - Public deal page shows operator copy + parity badge with the reseller-only comparison.
   - Form blocks save when `bookable` is unchecked.
3. Insert a synthetic redemption with `pricing_model='operator_markup'` and inspect the resulting `business_payout_lines` row via `read_query`.
4. Confirm `/legal/terms#activity-pricing` scrolls to the new section and the deal-page tooltip deep-links correctly.

### Out of scope (flagged, not changed)
- Real Stripe payment-method check for B currently uses `creator_payout_details` presence as a proxy; full Stripe Connect onboarding for operators is a separate task.
- Iframe embed will fail for sites that send `X-Frame-Options: DENY` — we surface a fallback message rather than trying to proxy.

Ready to switch to build mode and implement A–F in order, with the migration first (B + F + new profiles columns combined), then UI, then legal copy.