## Goal
Make the onboarding checklist read correctly for activity operators. Today the wording is hotel-biased ("Add property photos", "Add rooms / activity options", "Set prices") even when the operator only sells activities. Branch the copy by what the operator actually lists — without changing any gate logic, schema, trigger, or the `bookable` rule.

## Changes

### 1. `src/lib/bookable.functions.ts` (additive return field only)
- Add `accountKind: "stay" | "activity" | "unknown"` to `BookableStatus`.
- Derive inside the existing query path (no extra round-trip): from the same `deals` rows already fetched, look at `category`:
  - any deal with `category = "stay"` → `"stay"`
  - else if any deal with `category in ("do","tour")` → `"activity"`
  - else (no deals yet, or only eat/transport/other) → `"unknown"`
- Apply to both `getBookableStatus` (server fn) and `computeBookableStatus` (server-internal helper). Need to extend the `select("id")` to `select("id,category")`.
- Gate computation is untouched. The trigger and `bookable` boolean don't change.

### 2. `src/components/business/OnboardingChecklist.tsx` (copy only)
- Read `accountKind` from `bookable`.
- Replace the static `GATE_LABELS` import usage and `gateDescription` with local, kind-aware variants:

| Gate | stay / unknown (today) | activity |
|---|---|---|
| photos title | Add property photos | Add photos of your activity |
| photos desc | At least 3 photos of your property. | At least 3 photos of your activity or meeting location. |
| items title | Add rooms / activity options | Add your activity packages |
| items desc | Add rooms or activity options, each with a photo. | Add each package you sell (half-day, full-day, private, etc.), with a photo. |
| rates title | Set prices | Price each package |
| rates desc | Price each room/option with a cancellation policy. | Price each package and pick a cancellation policy. |
| calendar title | Connect your calendar | Connect availability |
| calendar desc | Connect an iCal feed (Booking.com, Airbnb, Lodgify) to prevent double-bookings. | Connect an iCal feed or add native time-slots so we never overbook you. |
| payouts | (unchanged) | (unchanged) |

- For `"unknown"` use the current (stay) copy so existing hotels see no change and brand-new accounts see neutral wording until their first deal sets the kind.

### 3. Out of scope
- `GATE_LABELS` / `GATE_LINKS` exported constants remain as-is (other callers may rely on them). The branching lives only in the checklist.
- `RoomsAndRatesEditor`, `BusinessPhotosEditor`, `PayoutMethodCard`, `DealForm` — not touched in this pass. `BusinessPhotosEditor` already accepts a `kind` prop; rewording the rooms/rates editor is a separate, larger UX pass.
- Gate logic, Stripe Connect requirements, commission math, schema, triggers — unchanged.

## Verification
- Operator with only `do`/`tour` deals → checklist shows activity wording.
- Hotel with any `stay` deal → checklist shows existing wording (regression-safe).
- Brand-new account with no deals → existing (stay-flavored) wording.
- `bookable === true` still hides the checklist; gate completion check still works because gate ids didn't change.