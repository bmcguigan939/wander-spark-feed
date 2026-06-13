## Root cause

`RoomsAndRatesEditor` only renders `RoomCard` (which contains `RoomPhotosUploader`) when the deal's category is `"stay"` (lodging). The wizard's Step 12 passes `firstDeal?.category` through. `ensureFirstDeal` derives `category = "stay"` only when **creating** a new draft — if a draft already existed with `category = "other"` (created before `setup_property_kind` was selected, or via `business.deals.new` with `accountKind` undefined), it's reused as-is. Result: the editor falls into the `!isLodging && !isActivity` branch and shows a flat "Rate plans" block with no rooms and no photo upload.

## Changes

1. **`src/lib/business-setup.functions.ts` — `ensureFirstDeal`**
   - When an existing draft is found, recompute the expected `category` and `price_unit` from the profile (same logic already used in the create path).
   - If the existing deal's `category` doesn't match (e.g. it's `"other"` but the host is a hotel/apartment/home/alternative), update the row to the correct `category` and `price_unit` before returning.
   - Only normalize when the deal is still a draft (`status = 'draft'`), to avoid mutating live listings.

2. **`src/routes/business.setup.tsx` — `Step12FirstUnit`**
   - Compute `expectedCategory` from `profile.setup_business_type` / `setup_property_kind` (mirror of the `ensureFirstDeal` logic).
   - Pass `category={expectedCategory}` to `<RoomsAndRatesEditor>` instead of `firstDeal?.category`, so even before the loader refetches the corrected deal, the editor renders the lodging UI.
   - After `ensure()` resolves, call `refresh()` (already happens) so `firstDeal.category` updates from the normalized row.

3. **No schema or UI changes to `RoomsAndRatesEditor`**
   - Per-room photo upload (`RoomPhotosUploader`) is already wired into `RoomCard`; it just wasn't reachable because the wrong branch was rendering.

## Out of scope

- Non-hotel (apartment/villa/unit) flow — already covered by the previous turn's `UnitPhotosUploader`.
- Activity packages — already render `PackageCard` with photo support.

## Technical notes

- `ensureFirstDeal` normalization: only mutate `category` and `price_unit` when `status = 'draft'` AND the derived values differ from the row's current values. Don't touch other fields.
- Derived mapping (kept identical between server fn and Step 12):
  - `setup_business_type === "activity"` → `activity_category === "tour" ? "tour" : "do"`, `price_unit = "per_person"`
  - `setup_property_kind ∈ {hotel, apartment, home, alternative}` → `"stay"`, `price_unit = "per_night"`
  - otherwise → leave alone (don't override to `"other"`).
