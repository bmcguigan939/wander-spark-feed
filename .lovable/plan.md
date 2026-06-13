# Two pricing models, driven by deal category

Today every booking uses one formula (`subtotal × 11%`) and "pay at property" skips Stripe entirely, so Travidz collects £0. We'll split behaviour by `deals.category`:

| Category | Model | What guest pays | What Travidz keeps | What provider gets |
|---|---|---|---|---|
| `stay` (hotel/villa/hostel) | **Commission** | Listed price | 11% of listed price | 89% of listed price |
| `tour`, `do`, `eat`, `transport`, `other` | **Markup** | Operator's net × 100/89 (≈ +12.36%) | The uplift | Their full net price |

## Hotel pay-at-property — the fix

When `payment_timing = 'pay_at_property'` AND category = `stay`:
- Do **not** skip Stripe.
- Charge the guest **11% of the subtotal** online now as a non-refundable deposit. That deposit IS Travidz's commission.
- Hotel collects the remaining 89% from the guest on arrival.
- Booking is marked `confirmed` only after the Stripe deposit succeeds (via existing webhook), not at insert time.
- UI copy on the booking page changes from "Pay £0 now" to "Pay £X deposit now — £Y on arrival at the property".

For `deposit_online_rest_at_property`: enforce a **minimum 11% deposit**. If the hotel's configured deposit_pct ≥ 11, no change. If < 11, bump it to 11. Commission stays at 11% of full subtotal (not 11% of deposit), taken as `application_fee_amount` on the Stripe charge.

For `pay_online`: unchanged.

## Tour operator markup — the fix

For non-`stay` categories, the price the operator enters in DealForm is their **net rate**. The guest-facing price (and the amount charged to Stripe) is `net × 100 / 89`, rounded up. Travidz's application fee = guest price − operator net × guests. Operator gets exactly what they listed.

- DealForm label changes per category: "Price guest pays" (stay) vs "Your net price — we add 11% on top" (tour/do/etc.).
- `bookings` rows record `operator_net_cents` alongside `subtotal_cents` for reconciliation.
- "Pay at property" is **disallowed** for tour operators in v1 — the operator collecting cash on the day means we have no way to claim our markup without invoicing. Force `pay_online` or `deposit_online_rest_at_property` (deposit ≥ markup).

## Files touched

1. `src/lib/booking.functions.ts` — branch on `deal.category`; new `chargeNow` rules; enforce deposit minimums; reject pay_at_property for non-stay.
2. `src/components/business/DealForm.tsx` — dynamic price-field label; hide the "pay at property" option when category ≠ stay; show preview "Guest will pay £X" for operators.
3. `src/routes/book.$dealId.tsx` — show "Deposit £X now • £Y at property" for hotel pay-at-property; show single guest-facing price for operators.
4. Migration:
   - Add `bookings.operator_net_cents int`, `bookings.markup_cents int` (nullable, for operator deals).
   - No schema change needed for category — already exists.
5. Webhook (`src/routes/api/public/payments/webhook.ts`) — verify; should already mark booking `confirmed` on `checkout.session.completed`. Remove the "pre-confirm pay_at_property at insert time" path.

## Technical details

**New `chargeNow` logic in `createBookingCheckout`:**

```text
isStay = deal.category === 'stay'

if isStay:
  subtotal = unitPrice * guests           // unitPrice = guest-facing
  commission = round(subtotal * 0.11)
  switch payment_timing:
    pay_online:                       chargeNow = subtotal
    deposit_online_rest_at_property:  depositPct = max(11, configured)
                                      chargeNow = round(subtotal * depositPct/100)
    pay_at_property:                  chargeNow = commission          // NEW
  applicationFee = commission         // always 11% of full subtotal
  businessPayout = subtotal - commission

else (operator):
  operatorNet = unitPrice * guests          // what operator listed
  subtotal = ceil(operatorNet * 100 / 89)   // what guest pays
  markup = subtotal - operatorNet
  reject if payment_timing == 'pay_at_property'
  chargeNow = (deposit flow) ? max(markup, deposit) : subtotal
  applicationFee = markup
  businessPayout = subtotal - markup        // = operatorNet
```

**Application fee** still flows via `payment_intent_data.application_fee_amount` + `transfer_data.destination` on Connect-active businesses.

**Edge cases handled:** rounding (use `Math.ceil` for guest price so we never under-collect markup), Connect not active (fall back to manual_bank — booking still created, but flag for manual reconciliation), refunds (refund the full `chargeNow`, including our commission, for cancellations within policy).

## Out of scope (flag for later)

- No-show fees / card-on-file for hotel pay-at-property guests who don't show.
- Allowing operators to opt into "pay at property" once we have a reliable invoicing flow.
- Surfacing the operator vs guest price split in the business dashboard analytics.
