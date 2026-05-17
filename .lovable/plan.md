# Google-Maps-style colour + layer switcher

## What changes

### 1. Default to a realistic, colourful base map
In `src/routes/map.tsx`, replace `mapbox://styles/mapbox/dark-v11` with `mapbox://styles/mapbox/standard` — Mapbox's modern photoreal style with proper greens for land, blue oceans, country borders, and subtle 3D buildings at city zoom. The existing pink/orange pins stay readable on top.

### 2. Add a layer switcher (Default / Satellite / Terrain)
New floating control on the right side of the map, matching the stacked-squares icon in your reference screenshots. Tapping it opens a small sheet with three options:

- **Default** → `mapbox://styles/mapbox/standard` (real-world colours, like Google's default)
- **Satellite** → `mapbox://styles/mapbox/satellite-streets-v12` (real satellite imagery + place labels, exactly like the second screenshot)
- **Terrain** → `mapbox://styles/mapbox/outdoors-v12` (topographic with hillshading)

The selected style persists in `localStorage` so it survives reloads. Implemented as a new `MapLayerSwitcher` component; the route owns the `style` state and passes it to the existing `MapboxMap`.

### 3. Category chips polish (presentation only)
`CategoryChips` already renders above the map. Light restyle so it reads like the Google pill chips against the new colourful base (white pill, icon + label, subtle shadow). No logic change.

## Out of scope (call out, don't build)
- Traffic / Cycling / Public-transport overlays — Mapbox doesn't ship these as free toggles; would need separate data sources. Easy to add later if you want.
- Custom Travidz-branded map style (Mapbox Studio) — possible follow-up once you've picked a palette.
- Search bar already exists (place + business search) — untouched by this change.

## Files touched
- `src/routes/map.tsx` — style state, new default, mount the switcher
- `src/components/map/MapLayerSwitcher.tsx` — new
- `src/components/map/CategoryChips.tsx` — minor visual tweak only

## Test plan
1. Open `/map` → world renders in real colours (green land, blue water).
2. Tap layers icon → sheet opens with Default / Satellite / Terrain.
3. Pick Satellite → map swaps to satellite imagery, pins remain visible.
4. Reload → still on Satellite (persisted).
