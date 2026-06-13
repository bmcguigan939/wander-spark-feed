# Fix: blank map when dropping a pin

## What the screenshot tells us
- Mapbox logo, +/‑ controls, info button and the centered pin all render → the map container has real width/height and Mapbox GL initialised successfully.
- The whole tile area is a flat dark gray → **the style/tiles never paint**. This is not the previous "0‑height flex" bug.

The `/map` page works with `mapbox://styles/mapbox/standard`. The picker is the only place using `mapbox://styles/mapbox/dark-v11` and is the only one broken — strong signal the issue is style‑specific (or a missing post‑mount `resize()` on the just‑mounted map).

## Plan

1. **Investigate in the live preview** (no code change yet):
   - Open the preview, navigate to `/create`, tap "Drop a pin".
   - Read browser console + network for the `LocationPickerSheet` map: look for `styles/v1/mapbox/dark-v11` 401/403/4xx, tile 401s, or a Mapbox GL "style is not done loading" / "Unauthorized" error.
   - This tells us whether it's a token/style access issue or a render/sizing issue.

2. **Apply the matching fix** (one of, decided from step 1):
   - **If `dark-v11` style returns 4xx / token error:** switch the picker to the same style the working `/map` uses — `mapbox://styles/mapbox/standard` — in `src/components/create/LocationPickerSheet.tsx` (line 202). Single‑line change.
   - **If style loads but tiles never paint (sizing race):** in `LocationPickerSheet.tsx`, add an `onLoad` handler on `<MapboxMap>` that calls `mapRef.current?.getMap().resize()`, and also call `resize()` once on the next frame after `open` flips to true. This forces Mapbox to recompute the canvas size after the fixed‑overlay finishes its layout, which is the documented fix for "map shown inside a just‑mounted modal renders blank tiles".
   - **If neither (CSP / network):** report findings back instead of guessing.

3. **Verify**: reopen the picker in the preview, confirm tiles render, pin still drops on tap, "Confirm location" still returns the picked coordinates. No other files touched.

## Files in scope
- `src/components/create/LocationPickerSheet.tsx` — only file expected to change.

## Out of scope
- The map page, bottom nav, search box, or any styling beyond the one map style / one `onLoad` resize call.
