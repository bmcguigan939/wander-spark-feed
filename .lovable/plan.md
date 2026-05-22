# Plan: Travidz-collects checkout (Stripe, no flights)

## Goal
Stop invoicing businesses for the 8%. Instead, the customer pays **Travidz** at checkout via Stripe. Travidz keeps 8%, remits 92% to the business on a payout schedule, and pays the creator their share of the 8% as today.

Catalog scope: experiences, tours, activities, hotels, accommodation. **No flights, no flight-inclusive packages.** This keeps us outside ATOL / Package Travel Regulations.

## Why this is a clean win for us
- Commission is guaranteed (we hold the cash before paying out).
- Creators get paid faster and more reliably.
- Better data: refunds, no-shows, cancellations all visible in our system.
- Stronger trust signal at checkout ("Booked via Travidz").

---

## 1. Policy & legal (must happen alongside code)
- Add a clear **"No flights or flight-inclusive packages"** rule to the Business Agreement and listing rules.
- Add a uniform **Travidz Cancellation & Refund Policy** that overrides per-business policies for any booking taken through our checkout. (Suggested default: full refund >7 days out, 50% 2–7 days, no refund <48h — businesses can opt to be stricter, not looser.)
- Add a **Booking Terms** page customers tick at checkout.
- Update Privacy Policy to mention payment processing via Stripe.
- VAT note: as merchant of record we are the seller for VAT. We'll need to be VAT-registered (or use Stripe Tax) before going live with real money. Flagged for accountant.

## 2. Payments setup
- Enable Lovable's built-in **Stripe payments** (seamless, no BYOK).
- Tax handling: **option 2 (Stripe automatic tax calculation + collection)**. Full MOR compliance is digital-only so doesn't apply to accommodation/experiences; option 2 gives us correct tax at checkout while we handle filing.
- Configure payout schedule (weekly to businesses).

## 3. Data model changes
Add to existing schema (no destructive changes):

- `deals`: add `bookable boolean default false`, `base_price_cents int`, `currency text default 'GBP'`, `inventory_mode text` (`unlimited` | `fixed` | `request`), `cancellation_policy text`.
- New `bookings` table: id, deal_id, creator_id (attribution), user_id (customer), travel_date, guests, subtotal_cents, tax_cents, total_cents, currency, stripe_payment_intent_id, stripe_checkout_session_id, status (`pending` | `paid` | `confirmed` | `cancelled` | `refunded` | `no_show`), commission_cents, business_payout_cents, created_at.
- New `business_payouts` table: id, business_id, period_start, period_end, gross_cents, commission_cents, net_cents, stripe_transfer_id, status (`draft` | `sent` | `paid` | `failed`).
- New `business_payout_lines`: payout_id, booking_id, gross_cents, commission_cents, net_cents.
- New `refunds` table: booking_id, amount_cents, reason, stripe_refund_id, initiated_by, created_at.
- Extend `deal_redemptions` flow so a confirmed `booking` auto-creates the redemption row (keeps existing creator-earnings + payout-run logic working unchanged).
- `profiles` (business side): add `stripe_connect_account_id`, `payout_method` (`stripe_connect` | `manual_bank`), `bank_details_encrypted`.

## 4. Business onboarding additions
- New step in business onboarding: **"How you get paid"** → connect Stripe (Stripe Connect Express) OR enter bank details for manual SEPA/BACS payout.
- Show clear summary: "Customer pays £100 → you receive £92 within 7 days of booking confirmation."
- Block listing creation until payout method is set.

## 5. Checkout flow (customer side)
1. Customer taps **Book** on a deal page (was previously a redirect/code).
2. New route `/book/$dealId` — pick date, guests, see price breakdown (subtotal, tax, total).
3. Server fn creates Stripe Checkout Session with Connect `transfer_data` set to the business's connected account, `application_fee_amount` = 8%.
4. Customer pays on Stripe-hosted page.
5. Stripe webhook (`/api/public/stripe/webhook`) verifies signature, flips booking → `paid`, emails business + customer, creates pending `deal_redemption` row stamped with creator attribution from the affiliate cookie/code.

## 6. Business confirms fulfilment
- Business gets the booking in their dashboard with customer name, date, contact.
- They click **Confirm** (or **Reject** within 24h). Confirm → redemption stamped `confirmed`, commission computed via existing `compute_redemption_commission` trigger, creator earnings flow exactly as today.
- Reject → automatic refund via Stripe + booking cancelled.

## 7. Refunds & cancellations
- Customer-initiated cancel: applies Travidz policy automatically, issues Stripe refund.
- Business-initiated cancel: full refund, business flagged (3 strikes → manual review).
- Refund reverses commission and creator earnings if already accrued.

## 8. Payouts to businesses
- With Stripe Connect + `transfer_data`, Stripe handles the 92% transfer automatically per booking — no separate payout cron needed for Connect businesses.
- For manual-bank businesses (fallback), weekly cron aggregates paid bookings → creates `business_payouts` row → admin marks paid after BACS run.

## 9. Admin
- New `/admin/bookings` page (list, filter by status, refund button).
- New `/admin/business-payouts` page (Connect status, manual queue).
- Update `/admin/index` stats: GMV now = sum of `bookings.total_cents` where status in (`paid`,`confirmed`).

## 10. Migration of existing listings
- Existing deals stay on legacy "code redemption / self-checkout" flow.
- New `bookable=true` flag opts a deal into Travidz checkout.
- Backfill is opt-in per business during a 30-day grace window, then new listings must use Travidz checkout.

---

## Out of scope (explicitly)
- Flights, flight+hotel packages, package holidays (ATOL territory).
- Multi-currency settlement (GBP only at launch; EUR/USD later).
- Customer accounts that store cards (Stripe handles via Checkout).

## Technical / sequencing
```
Phase 1 (foundation)
  └─ Enable Stripe payments
  └─ Migration: bookings, payouts, deals.bookable, profile.stripe_connect_account_id
  └─ Business Stripe Connect onboarding flow

Phase 2 (checkout)
  └─ /book/$dealId route + price calc
  └─ Server fn: create checkout session w/ application_fee + transfer_data
  └─ /api/public/stripe/webhook handler (signature verify, idempotent)
  └─ Customer + business confirmation emails

Phase 3 (lifecycle)
  └─ Business confirm/reject UI
  └─ Refund engine + cancellation policy enforcement
  └─ Admin bookings + payouts pages

Phase 4 (policy + go-live)
  └─ Updated Business Agreement, Booking Terms, Refund Policy
  └─ VAT / Stripe Tax configuration
  └─ Soft launch with a single category (experiences) before opening to hotels
```

## Open questions before I start building
1. Default cancellation policy numbers (the 7-day / 48h proposal above) — keep or adjust?
2. Stripe Connect Express (Stripe-hosted onboarding, fastest) vs Custom (full white-label, much more work) — Express recommended.
3. Should the legacy invoice flow be retired immediately or kept as a fallback for already-onboarded businesses?
