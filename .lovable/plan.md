## Goal
Update Travidz's legal docs to reflect the live payments/payouts/bookings system (Phase 2 + 3). Today they still say payouts are "not yet enabled" and Terms claim "we don't sell, ship or fulfil bookings" — both are now wrong.

## What changes per file

### 1. `src/routes/legal.terms.tsx`
- **§4 Deals**: rewrite. Travidz now processes bookings on behalf of businesses via a third-party payment processor. Customer's contract for the deal itself is still with the business, but Travidz is the merchant of record for the payment.
- **New §5 Bookings, payment, refunds** (renumber rest):
  - Price shown is what you pay at checkout in GBP.
  - Each deal sets its own refund policy (set by the business, visible before checkout).
  - Statutory travel-services exemption: UK/EU 14-day cooling off does not apply to accommodation, transport, car hire, catering or leisure services tied to specific dates.
  - Confirmation email sent on successful payment.
- Update "Updated" date to **November 2026**.

### 2. `src/routes/legal.business-agreement.tsx`
- **§5 Commissions and payouts**: replace the "not yet enabled" paragraph. New content:
  - Travidz collects customer payment, retains the 8% commission, and pays the net to your bank account.
  - **Payouts are weekly, T+7 from each deal's start date** (covers the refund window).
  - Bank details must be set in your dashboard before you can list bookable deals.
  - Minimum payout threshold: £25; balances roll over below that.
  - Currency: GBP only at launch.
- **New §6 Refunds and chargebacks** (renumber price-match to §7, etc.):
  - You set the refund policy per deal; you decide whether to approve a customer refund request.
  - When you approve, Travidz facilitates the refund through the payment processor on your behalf, and the corresponding amount is deducted from your next payout (including the commission portion, which is also reversed).
  - Chargebacks are deducted from your next payout; you can dispute via the dashboard.
- **New §10 Bank details and security**:
  - Bank details are encrypted at rest using a key held in our secure vault and are only accessible to authorised support staff for payout operations.
- Update "Updated" date.

### 3. `src/routes/legal.creator-agreement.tsx`
- **§5 Earnings**: replace final sentence ("payouts will be issued once payments infrastructure is launched") with: payouts are weekly, T+7 from the booked deal's start date, to the bank account you set in your dashboard; £25 minimum threshold; GBP only.
- Update "Updated" date.

### 4. `src/routes/legal.privacy.tsx`
- **What we collect**: add `Booking data` (deals booked, dates, amounts, refund history) and `Payment data` (handled by our payment processor — we store transaction IDs and last-4 only, never card numbers).
- **New dedicated section "Payment & payout data"**:
  - For businesses: bank account / IBAN / sort code, encrypted at rest with a vault-managed key, decrypted only by authorised support staff for payout operations and never exposed to other users or in API responses.
  - For customers: payment is processed by a PCI-compliant third party; we receive a token and metadata, not card data.
- **Sharing**: add payment processor and email delivery (booking confirmations) to the list of service providers.
- **Retention**: bookings and payout records retained for 7 years for tax/accounting compliance.
- Update "Updated" date.

### 5. `src/routes/legal.cookies.tsx`
- No changes needed (current content still accurate).

### 6. `src/routes/legal.dmca.tsx`
- No changes needed.

### 7. `src/routes/legal.index.tsx`
- If it lists "Last updated" dates per doc, refresh them. Otherwise no change.

## Out of scope
- No new pages, no new components, no schema changes — pure copy edits to existing legal route files.
- Not changing commission rate, creator tier splits, or Best Price Guarantee mechanics.
- Not naming the payment processor explicitly (kept generic as "our payment processor") per Lovable Cloud abstraction guidance.
