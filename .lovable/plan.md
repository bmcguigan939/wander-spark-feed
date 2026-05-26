
# Automatic payouts to businesses via Stripe Connect

Goal: when a customer books on Travidz, Stripe automatically splits the payment — operator/hotel's share goes straight to their bank, Travidz keeps its fee — with zero manual admin.

Today we collect into Travidz's Stripe account and only store bank details as text (`profiles.payout_bank_details_encrypted`) to pay out manually. That blocks launch per your requirement. We need **Stripe Connect** with **destination charges + application_fee_amount** (or `transfer_data`), which is Stripe's built-in way to do exactly this.

---

## 1. Connect account model

- Use **Stripe Connect Express accounts** (Stripe-hosted onboarding, KYC, bank capture, tax forms, payout schedule — all handled by Stripe).
- One Connect account per `profiles` row where `account_type in ('hotel','operator')`.
- Same model works for both hotels (commission) and operators (operator_markup) — only the fee math differs.

## 2. Database changes (migration)

Add to `profiles`:
- `stripe_connect_account_id text` (acct_...)
- `stripe_connect_status text` — `none | pending | restricted | active`
- `stripe_connect_charges_enabled boolean`
- `stripe_connect_payouts_enabled boolean`
- `stripe_connect_requirements jsonb` (snapshot of Stripe's `requirements` object for UI)
- `stripe_connect_updated_at timestamptz`

Add to `deals`:
- `connect_account_id text` (snapshot at booking time so payouts survive operator profile edits)

Deprecate (keep column, stop writing): `payout_bank_details_encrypted`, `payout_method='manual_bank'`. Migrate the existing `PayoutMethodCard` UI to launch Connect onboarding instead.

Update `has_role`-style guards: a deal can only be set `bookable=true` if `stripe_connect_payouts_enabled=true` on the owner's profile. Enforce via trigger (mirrors the existing `trg_deals_validate_operator_markup`).

## 3. Server functions (new `src/lib/stripe-connect.functions.ts` + `.server.ts`)

- `createConnectOnboardingLink` — calls `stripe.accounts.create({ type:'express', country, email, business_type, capabilities:{ card_payments, transfers } })`, then `stripe.accountLinks.create` for the hosted onboarding URL. Persists `stripe_connect_account_id`.
- `refreshConnectStatus` — `stripe.accounts.retrieve`, writes `charges_enabled` / `payouts_enabled` / `requirements` to the profile.
- `createDashboardLoginLink` — `stripe.accounts.createLoginLink` so business users can update bank/KYC later.

All use the existing gateway pattern in `src/lib/stripe.server.ts` (no direct SDK key).

## 4. Checkout split (modify `src/routes/book.$dealId.tsx` flow + `booking.functions.ts`)

When creating the Checkout Session:
- Look up the deal's `connect_account_id` + pricing model.
- Compute `application_fee_amount` in cents:
  - **Hotel / commission deals:** `application_fee_amount = round(price * 0.11)` (Travidz keeps 11% pool, hotel receives 89% minus Stripe fees).
  - **Operator markup deals:** `application_fee_amount = price − operator_base_price` (uplift goes to Travidz pool; operator nets exactly their own site price minus Stripe fee).
- Pass `payment_intent_data: { application_fee_amount, transfer_data: { destination: connect_account_id } }` on the session.
- Stripe automatically: charges card → routes operator's share to their connected account → routes Travidz's fee to platform → triggers payout to operator's bank on their Stripe payout schedule.

## 5. Webhook updates (`/api/public/payments/webhook`)

Add handlers for:
- `account.updated` → call `refreshConnectStatus` (keeps `charges_enabled` / `payouts_enabled` in sync, surfaces KYC blockers).
- `payout.paid` / `payout.failed` → store on a new `connect_payouts` table for the business dashboard ("Last payout: £X on date").
- Existing `checkout.session.completed` handler: persist `application_fee_amount` and `transfer_data.destination` on `deal_redemptions` for reconciliation.

## 6. UI changes

- **`src/routes/business.onboarding.payout.tsx`** — replace bank-details form with single "Connect bank with Stripe" button → opens Stripe-hosted onboarding → returns to a success page that calls `refreshConnectStatus`.
- **`src/components/business/PayoutMethodCard.tsx`** — show Connect status badge (Active / Action required / Not started), requirements list if any, "Update bank or details" button (→ login link), "Payout schedule: daily/weekly".
- **`OnboardingChecklist.tsx`** — add "Connect payouts" step; block "Go live with deals" until `stripe_connect_payouts_enabled=true`.
- **`DealForm.tsx`** — disable `bookable` toggle with tooltip "Finish payout setup first" when Connect isn't active.
- **`business.signup.tsx`** (operator) — add Stripe Connect step right after operator-site URL.
- **Admin `/admin.payouts.tsx`** — switch from manual bank list to read-only Connect status table + link to each account's Stripe dashboard.

## 7. Secrets

Connect uses the **same `STRIPE_SANDBOX_API_KEY` / `STRIPE_LIVE_API_KEY` + gateway** — no new secrets. Webhook secret already configured. We just need to confirm the Stripe account has **Connect Express enabled** in both sandbox + live (one-click in Stripe dashboard during go-live; flagged as a launch checklist item, not blocking dev work).

## 8. Go-live checklist additions

- Stripe Connect platform enabled (sandbox ✅ + live).
- Platform branding for Connect onboarding (logo, support email) set in Stripe dashboard.
- At least one test operator + one test hotel completed Express onboarding in sandbox and received a test payout end-to-end.
- `business_agreement` and `legal.terms` updated to disclose: payouts processed by Stripe Connect; KYC required; Stripe is the money transmitter.

---

## Build order (single PR per step, each ships independently)

1. Migration: Connect columns on `profiles` + `deals` + `connect_payouts` table + bookable trigger.
2. `stripe-connect.functions.ts` + `.server.ts` (create account, account link, refresh, login link).
3. Onboarding UI: `business.onboarding.payout.tsx` + `PayoutMethodCard` rewrite + checklist gating.
4. Checkout split in `booking.functions.ts` (destination charges + application_fee_amount).
5. Webhook handlers for `account.updated` + `payout.*` + redemption fee snapshot.
6. Admin dashboard rewrite + legal copy updates + smoke test in sandbox (create acct → onboard → book → verify split + payout).

Estimated scope: ~6 focused build turns. After step 6 both hotel and operator payouts are fully automatic — Stripe pulls from the customer's card, splits the money at charge time, and pays out to each business's bank on Stripe's schedule with zero Travidz intervention.

## Risk / call-outs

- **Existing bookings** before this ships keep using manual payout. We won't backfill — they're handled out-of-band.
- **Express vs Standard:** Express keeps the user inside Travidz branding and lets us control payout schedule. Standard would give operators a full Stripe dashboard but worse UX. Recommend Express; easy to switch later.
- **Country coverage:** Stripe Connect Express supports 46 countries. UK + EU + US + AU/NZ covered. Flag at signup if operator is outside supported set.
- **`book.match.$code` (price-match flow):** uses same `booking.functions.ts` path, so it inherits the split automatically.
