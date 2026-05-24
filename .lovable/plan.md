## Goal

Add Booking.com-style **Rooms + Rate Plans** to deals, so businesses can sell multiple room types (Double, Triple, Quadruple…) each with multiple commercial offers (Refundable, Non-refundable, +Breakfast, etc.), and travellers pick one before checkout.

## Model

```
Deal (property/experience)
 └── Room type (optional — lodging only)   photos, beds, size, inventory
      └── Rate plan                         price, cancellation, payment, perks
```

- **Lodging categories** that prompt for rooms: `hotel`, `bnb`, `villa`, `apartment`, `hostel`, `resort`. All other categories (tours, activities, restaurants, spa, experiences) skip rooms — rate plans hang directly off the deal as a single implicit unit.
- Inventory lives on the **room** (or deal, if no rooms). Rate plans share that pool — booking any rate on a Double drops all Double rates by the booked guest count.

## Database

New tables:

- `deal_rooms` — `deal_id`, `name`, `description`, `photos` (jsonb), `bed_config` (jsonb: e.g. `[{type:'queen',count:1}]`), `room_size_sqm`, `max_guests`, `inventory_total`, `inventory_remaining`, `sort_order`, `is_active`.
- `deal_rate_plans` — `deal_id`, `room_id` (nullable, set when deal has rooms), `name`, `price_cents`, `compare_at_price_cents`, `currency`, `cancellation_policy_code`, `payment_timing` (`pay_online` | `pay_at_property` | `deposit_online_rest_at_property`), `deposit_pct` (nullable), `breakfast` (`included` | `available_paid` | `none`), `guests_included`, `perks` (jsonb), `discount_label`, `sort_order`, `is_active`.

Backfill: every existing deal gets one default rate plan using its current `price_cents` + `cancellation_policy_code`, no room. `deals.price_cents` becomes the "from" price (min across active rate plans, recomputed on write via trigger).

`bookings` gains: `rate_plan_id`, `room_id` (nullable), `payment_timing`, `balance_due_at_property_cents`.

RLS: rooms + rate plans follow the deals pattern (business owns, public reads when parent deal is `is_active` + `approved`).

## Business UI

In **Business → Deal → Edit**, between "Pricing" and "Availability":

1. **Rooms** section (only shown for lodging categories). Stacked cards, "Add room" button. Each room card: name, description, photos uploader, bed config, size, max guests, inventory total. Reorderable.
2. **Rate plans** section. If deal has rooms → each room card has its own "Rate plans" subsection. If no rooms → one flat list under the deal. Each rate card: name, price + optional strike-through, cancellation policy picker (existing 5 presets), payment timing dropdown, breakfast option, perks chips, "active" toggle.

Sensible defaults when creating: first rate plan auto-named "Standard rate", payment timing = `pay_online`, cancellation = deal's current policy.

## Traveller UI (`/deals/$id`)

- Hero stays the same, price shows as "from £X".
- New **"Choose your room"** section (lodging) or **"Choose your rate"** (non-lodging).
- Lodging layout matches the screenshots: room name + photos/beds/size on the left, stacked rate cards on the right showing perks, price, strike-through, "We have N left" badge when inventory ≤ 5, **Select** button per rate.
- Non-lodging: flat rate cards directly.
- Selecting a rate → `/book/$dealId?rate=<ratePlanId>` (and `&room=<roomId>` when applicable).

## Booking + Stripe

`createBookingCheckout` accepts `ratePlanId` (+ optional `roomId`), re-validates `is_active`, inventory, and uses the rate plan's `price_cents` + `cancellation_policy_code` (not the deal's). Branch on `payment_timing`:

- **`pay_online`** — full Stripe Checkout, 8% commission, T+7 payout. Unchanged shape.
- **`pay_at_property`** — skip Stripe. Create `confirmed` booking with `total_cents = 0`, email business + traveller, payment collected at check-in. No commission until property reports collection (v2: add a "mark collected" action on the business dashboard that triggers commission line).
- **`deposit_online_rest_at_property`** — Stripe Checkout for `price_cents * deposit_pct`, store `balance_due_at_property_cents` on booking, show on business dashboard. Commission calculated on full amount, deducted from deposit + future collection.

Inventory: decrement `inventory_remaining` on confirmed booking (room-level if rooms exist, else deal-level), increment on cancellation. Hide rate plans when their room/deal has 0 left.

## What doesn't change

Deal title, photos, location, category, commission %, payout schedule, the existing 5 cancellation presets, the existing date-blocking calendar, Stripe webhook handling, agreement.

## Defer to v2

- "Mark collected" workflow for `pay_at_property` commission timing.
- Per-guest pricing engine (price changes by adult/child mix). For now: a free-text "Priced for 2 adults" label on the rate plan + `guests_included` numeric.
- iCal export per room (current export stays at deal level).

## Tech notes

- Migration runs in one go; backfill is idempotent.
- Update `deals.functions.ts` to return rooms + rate plans on `getDealById`; add `getDealRatePlans`, `upsertRoom`, `upsertRatePlan`, `deleteRoom`, `deleteRatePlan` server fns under `requireSupabaseAuth`.
- Update `createBookingCheckout` signature; existing callers without `ratePlanId` fall back to the auto-migrated default rate (back-compat for any in-flight links).
- Add a trigger to recompute `deals.price_cents` = min(active rate plan prices) on insert/update/delete of rate plans.
