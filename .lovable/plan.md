## Remaining work (Steps 4–6 of 6)

Steps 1–3 are done: DB migration, `stripe-connect.functions.ts`, checkout split with `application_fee_amount` + `transfer_data.destination`, webhooks for `account.updated` / `payout.*`, and Connect-gated onboarding UI.

### Step 4 — Legal copy updates

Update two pages to disclose Stripe Connect / KYC and the payout model:

- `src/routes/legal.business-agreement.tsx`
  - Add "Payouts via Stripe Connect" section: operators/hotels onboard to Stripe Express, complete KYC with Stripe, and receive payouts directly from Stripe to their linked bank account.
  - Clarify Travidz never holds operator funds long-term; Stripe splits each charge at capture (`application_fee_amount` to Travidz, remainder to connected account).
  - Document the 11% platform fee for commission deals and "uplift = price − operator base price" for markup deals.
  - Note that Stripe (not Travidz) handles bank verification, payout scheduling, and tax forms (1099-K where applicable).

- `src/routes/legal.terms.tsx`
  - Short customer-facing note: payments processed by Stripe; for bookings of third-party hotels/operators, funds settle to the provider via Stripe Connect.

### Step 5 — Admin payouts dashboard rewrite

Replace the existing "manual bank details" admin view with a read-only Connect status table.

- New server fn `listConnectAccounts` in `src/lib/admin.functions.ts` (admin-only middleware): returns one row per hotel/operator profile with `stripe_connect_account_id`, `stripe_connect_status`, `charges_enabled`, `payouts_enabled`, `requirements.currently_due` count, last `connect_payouts` entry (amount, status, arrival_date).
- New server fn `getConnectDashboardLinkForProfile` (admin-only): wraps `createConnectDashboardLink` for a target profile so admins can open Stripe Express dashboard on behalf of an operator for support.
- Update `src/routes/admin.payouts.tsx` (or create if absent):
  - Table columns: Business, Type, Connect status badge, Charges, Payouts, Outstanding requirements, Last payout, Actions (Open Stripe dashboard, Refresh status).
  - Remove all references to `payout_bank_details_encrypted` and the manual approval flow.
  - "Refresh status" calls `refreshConnectStatus` for the selected profile.

### Step 6 — End-to-end smoke test (sandbox)

Run a scripted sandbox test and capture results in chat:

1. Create test operator + hotel profiles, call `startConnectOnboarding`, complete Express onboarding with Stripe test data (`000-00-0000`, routing `110000000`, account `000123456789`).
2. Verify `account.updated` webhook fires → DB columns `stripe_connect_status='active'`, `charges_enabled=true`, `payouts_enabled=true`.
3. Confirm `bookable=true` is now allowed on a deal owned by that profile; confirm it is rejected for a profile without active Connect (trigger error).
4. Run a test commission booking ($100 deal):
   - Expect Checkout Session created with `application_fee_amount=1100` (11%) and `transfer_data.destination=<acct_...>`.
   - Complete payment with test card `4242 4242 4242 4242`.
   - Verify `checkout.session.completed` webhook stores fee snapshot on `deal_redemptions`.
5. Run a test operator markup booking (operator base $80, listed $100):
   - Expect `application_fee_amount=2000` (uplift), destination = operator's Connect account.
6. Trigger a Stripe sandbox payout, verify `payout.paid` webhook writes to `connect_payouts`.
7. Confirm admin dashboard shows both accounts as active with correct last-payout row.

Output: a pass/fail checklist in chat plus any bugs found and fixed inline.

### Files touched

- Edit: `src/routes/legal.business-agreement.tsx`, `src/routes/legal.terms.tsx`, `src/routes/admin.payouts.tsx`
- Create: `src/lib/admin.functions.ts` additions (or new `admin-connect.functions.ts` if cleaner)
- No new migrations, no new secrets

### Out of scope (intentionally)

- 1099-K generation UI (Stripe handles directly)
- Multi-currency payouts (USD only for launch)
- Connect Standard accounts (Express only)

Approve to proceed with Step 4 first, then 5, then 6 in sequence.