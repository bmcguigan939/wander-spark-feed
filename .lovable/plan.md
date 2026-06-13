## Goal

In `src/routes/business.setup.tsx`, replace the free-text Mapbox geocoder used in the two location steps (Step 4 "Where is your property?" for stays around line 624, and the equivalent activity location step around line 1775) with a Google Places (New) postcode/address autocomplete plus a manual-entry fallback. No changes to other screens (dashboard banner, map search) — Mapbox stays put there.

## What the user sees

1. **Search field** labelled "Postcode or address" with a magnifier icon. As they type (debounced 250 ms), a suggestions list appears below, each row showing the formatted address. Picking a row fills the field, drops a confirmed pin card, and enables Continue.
2. **"Can't find it? Enter address manually"** link under the field. Clicking switches the panel to a small form:
   - Address line 1 (required)
   - Address line 2 (optional)
   - City (required)
   - Postcode (required)
   - Country (required, default = previously detected if any)
   - "Back to search" link to return to autocomplete mode.
   On Continue, the manual address is saved as-is; in the background we fire a single Google geocode call to attach `lat/lng/place_name` so the business still appears on the map. If geocoding fails we save without coords and show a small inline note ("We couldn't pin this on the map yet — you can set it later from Settings"). Continue is **not** blocked by the geocode result.
3. Existing saved address pre-fills the search field as before.

## Provider wiring

- Use the **Google Maps Platform** connector (gateway-enabled). Link it via `standard_connectors--connect({ connector_id: "google_maps" })` so `LOVABLE_API_KEY` and `GOOGLE_MAPS_API_KEY` are present in the server runtime.
- All calls go through the connector gateway (never direct to Google). Browser key is not needed — both autocomplete and geocoding will be server-function calls.

## Technical changes

### New server functions — `src/lib/google-places.functions.ts`

- `placesAutocomplete({ input, sessionToken, countryBias? })` → `POST https://connector-gateway.lovable.dev/google_maps/places/v1/places:autocomplete` with field mask `suggestions.placePrediction.placeId,suggestions.placePrediction.text`. Returns `{ suggestions: { placeId, text }[] }`. Zod-validate input (1–120 chars).
- `placeDetails({ placeId, sessionToken })` → `GET https://connector-gateway.lovable.dev/google_maps/places/v1/places/{placeId}` with field mask `id,formattedAddress,location,addressComponents,displayName`. Returns `{ formattedAddress, lat, lng, components: { line1, city, postcode, country, region } }` (mapped from `addressComponents` by type).
- `geocodeAddress({ line1, line2?, city, postcode, country })` → same `/places:searchText` endpoint with the joined address as `textQuery`, field mask `places.location,places.formattedAddress`. Returns `{ lat, lng, formattedAddress } | null`.

All three: `createServerFn({ method: "POST" })` with Zod `inputValidator`, no auth middleware (read-only public lookup), throw on non-2xx with status + body.

### New component — `src/components/business/AddressPicker.tsx`

Reusable, accepts `{ initial?: { address, place_name, lat, lng }, onConfirm: (v: { address, place_name, city, country, lat, lng }) => Promise<void>, busy: boolean }`. Owns:
- a stable Places session token (UUID, regenerated after each confirm),
- search vs manual mode state,
- debounced autocomplete query,
- suggestions list rendering and pick → `placeDetails` to populate the confirm card,
- manual form with Zod validation, calling `geocodeAddress` then `onConfirm` regardless of geocode outcome.

### `src/routes/business.setup.tsx`

- Replace the body of `Step4Address` (stays path, ~624) and the activity location step (~1775) with `<AddressPicker ... onConfirm={...} />`. Keep their existing `StepTitle`, `StickyFooter`, `saveSetupAddress` call (unchanged), back/refresh wiring, and city/country derivation (use `components.city`/`components.country` when present, fall back to splitting `formattedAddress`).
- Drop the local Mapbox `geocode` usage from those two functions only. Leave the Mapbox `geocodePlace` server fn and its other consumers (`BusinessLocationPrompt`, map `SearchBox`) untouched.

### No DB / schema changes

`saveSetupAddress` already accepts `address, place_name, business_city, business_country, lat, lng` — same payload shape after the swap.

## Out of scope

- Mapbox is not removed; it still powers the map search and the dashboard banner.
- No edits to map search, dashboard location prompt, or settings screens.
- No browser-side Google JS API (`PlaceAutocompleteElement`) — gateway-only keeps auth/credentials server-side and avoids the Maps JS bundle.

## Steps to execute (after approval)

1. Call `standard_connectors--connect({ connector_id: "google_maps" })` and wait for the user to pick/create a connection.
2. Add `src/lib/google-places.functions.ts`.
3. Add `src/components/business/AddressPicker.tsx`.
4. Patch the two location steps in `src/routes/business.setup.tsx` to use it.
5. Quick manual QA in the preview wizard on the stays path and the activity path.
