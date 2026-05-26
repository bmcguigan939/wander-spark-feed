## Commission model — confirmed rules

Two booking types, both already wired through Stripe Connect with split capture. Operator/hotel always receives their entitled amount in full; **Stripe processing fee always comes out of Travidz's cut**, never the partner's.

### Hotel bookings (commission model)
- Customer pays listed price (e.g. £100)
- Hotel receives **89%** via `transfer_data.destination` (£89.00)
- Travidz application fee: **11% gross** (£11.00)
- Stripe processing fee (~2.9% + £0.20) deducted from Travidz's £11 → Travidz net ~£7.90
- Net pool flows into `commission.ts` tier split (creator vs platform per tier)

### Operator bookings (markup model)
- Operator sets base rate (e.g. £80); deal listed at customer price (e.g. £100)
- Operator receives **base rate** via `transfer_data.destination` (£80.00 — their advertised rate)
- Travidz application fee: **full uplift** = listed − base (£20.00)
- Stripe processing fee deducted from Travidz's £20 → Travidz net ~£16.90
- Net pool flows into `commission.ts` tier split

### Code changes

1. **`src/lib/booking.functions.ts`**
   - `COMMISSION_PCT = 8` → `COMMISSION_PCT = 11` (hotel path only).
   - Operator markup path already uses `price − operator_base_price`; no change.
   - Both paths continue to use `application_fee_amount` + `transfer_data.destination` so Stripe deducts processing fees from the platform fee, leaving the partner's payout untouched.

2. **No change needed**
   - `src/lib/commission.ts` — already `totalPct: 11` with Stripe-fees-absorbed model.
   - `legal.creator-agreement.tsx`, `legal.business-agreement.tsx` — already state 11%.
   - Webhook + `connect_payouts` recording — unaffected.

### Smoke check after the change
- £100 hotel booking: Checkout Session shows `application_fee_amount=1100`, destination = hotel's Connect account, hotel payout = £89.
- £100 operator deal (base £80): `application_fee_amount=2000`, destination = operator's Connect account, operator payout = £80.
- `deal_redemptions` fee snapshot reflects the same numbers.

### Out of scope
- No DB migration, no new secrets.
- No change to refund reversal flow.
- Creator tier math is already correct in `commission.ts` and stamped per redemption.
