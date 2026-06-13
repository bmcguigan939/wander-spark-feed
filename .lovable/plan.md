# Drop-pin location picker for photo/video uploads

Today the create-video form (`src/routes/create.tsx`) collects `lat`/`lng` via two number fields and a paste-a-Google-Maps-URL helper (`CoordsInput`). Most users won't type coords. Add a real map picker.

## What we'll add

A new "Pick on map" button next to the coordinates field that opens a full-screen sheet with a Mapbox map. The user can:

- **Tap anywhere** on the map → drops/moves a pin there.
- **Drag the pin** to fine-tune.
- **Search a place** (reuses the existing `src/components/map/SearchBox.tsx` Mapbox geocoder) → recentres and drops a pin.
- **Use my location** (browser geolocation) → recentres + drops a pin.
- **Confirm** → writes `lat`, `lng` back to the form, and best-effort fills `country`, `city`, `destination` from Mapbox reverse geocoding (only fills blanks — never overwrites what the user typed).

If the user already entered coords or chose a pin previously, the picker opens centred there. Otherwise it opens at the device's last known location or, failing that, the current map default (`lng:0, lat:20, zoom:1.6`).

## UX details

- Bottom-sheet style (consistent with existing `ClusteredSheet`, `MusicPickerSheet`), full-height on mobile.
- Mapbox dark style matching the app theme (`mapbox://styles/mapbox/dark-v11`).
- Pin = primary-coloured (`#3B82F6`) `MapPin` lucide icon, draggable, with a subtle drop-shadow.
- Sticky top bar: search box on the left, "Use my location" icon-button on the right, close (X) on the far right.
- Sticky bottom bar: shows current coords + resolved place name; "Confirm location" primary button (disabled until a pin is placed); "Clear" secondary.
- Coordinates input below the map button stays editable for power users who want to type or paste.

## Files touched

1. **New `src/components/create/LocationPickerSheet.tsx`** — the sheet. Owns its own `MapboxMap`, marker state, search, reverse-geocode call. Props: `open`, `initialLat`, `initialLng`, `onClose`, `onConfirm({ lat, lng, country?, city?, destination? })`.
2. **`src/routes/create.tsx`** — add a "Pick on map" button beside `CoordsInput`. Wires sheet open/close, applies confirm to existing `lat`/`lng`/`country`/`city`/`destination` state setters.
3. **`src/lib/map.functions.ts`** — add a small `reverseGeocode` server function wrapping Mapbox's `/geocoding/v5/mapbox.places/{lng},{lat}.json` endpoint so the token stays server-side and we can rate-limit later. Returns `{ country, city, place }`.

No DB changes. The videos table already stores `lat`/`lng` (and the form already submits them).

## Technical notes

- Reuse the existing Mapbox public token already in `src/routes/map.tsx` (it's a `pk.` publishable token, safe in client bundles). We'll lift it to `src/lib/mapbox-token.ts` so both `map.tsx` and the new sheet import from one place.
- Reverse geocoding is server-side so we can switch to a secret token later without code changes. It uses Mapbox's free tier (100k req/mo) — fine for current volume.
- The `SearchBox` component already exists and emits `{ lng, lat, place_name }`; we'll reuse it inside the sheet.
- The picker writes `lat`/`lng` as strings (matching `create.tsx`'s current state shape) to avoid type churn.
- Marker drag uses `react-map-gl` `<Marker draggable onDragEnd={...}>`.

## Out of scope

- Saving an address string separately on the video row (we already have `destination`, `city`, `country`).
- Applying the picker to other surfaces (business `AddressPicker`, deal locations) — those already have their own pickers. Could be unified later.
- Offline / cached map tiles.
