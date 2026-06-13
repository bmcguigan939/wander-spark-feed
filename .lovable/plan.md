## Current state

The upload form (`src/routes/create.tsx`) has three plain text inputs — **Country**, **City**, and **Destination / place** — with no live suggestions. Geocoding only runs at publish time as a fallback. Linda's Prague post failed precisely because typed text never resolved to coordinates.

Meanwhile, the project already ships two address-lookup building blocks:

- `placesAutocomplete` + `placeDetails` (Google Places) — used by `src/components/business/AddressPicker.tsx` for business onboarding.
- `geocodePlace` (Mapbox) — used by `src/components/map/SearchBox.tsx` for the map.

So smart lookup exists in the app, but it is **not wired into the creator upload flow**.

## Plan

1. **New shared component `src/components/create/PlaceAutocomplete.tsx`**
   - Single search input with a dropdown of Google Places suggestions (debounced ~250ms, `placesAutocomplete` server fn).
   - On select → call `placeDetails` to get `{ lat, lng, name, city, country, formatted_address }`.
   - Emits a structured result the parent can map to its existing state.
   - Reuses the visual style of `AddressPicker` for consistency.

2. **Wire it into `src/routes/create.tsx`** (both the publish form and the draft-edit form — same fields appear twice in the file).
   - Replace the three separate inputs with one **"Search a place"** autocomplete at the top of the location section.
   - Picking a suggestion fills `destination`, `city`, `country`, `lat`, `lng` in one step and clears the "no map pin" warning.
   - Keep the existing Country / City / Destination inputs visible underneath as **editable, pre-filled** fields so users can still tweak wording (e.g. "Hotel Augustine" instead of "Letenská 12/33").
   - Keep the existing "Pick on map" button and `LocationPickerSheet` as the fallback when no suggestion matches.

3. **Keep the publish-time guard already added last turn** as a safety net for users who skip the autocomplete entirely.

## Out of scope

- Replacing the map's Mapbox SearchBox with Google Places.
- Touching the business AddressPicker.
- Reworking the publish guard or the Linda backfill (already done).

## Files

- **Add:** `src/components/create/PlaceAutocomplete.tsx`
- **Edit:** `src/routes/create.tsx` (two form sections)

No DB, no new server functions, no new secrets — `GOOGLE_PLACES_API_KEY` is already configured for the existing `placesAutocomplete` fn.
