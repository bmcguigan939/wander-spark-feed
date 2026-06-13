# Fix Map header overlap + add drop-pin on Map

## 1. Safe-area top padding (global)

The map's top controls sit at `top-0` so iOS status bar (clock, signal, battery) covers the search box. Same risk on any other full-screen route.

- `src/components/layout/BottomNav.tsx` → `MobileShell`: wrap content in a container that applies `padding-top: env(safe-area-inset-top)` so every page using the shell is pushed below the status bar automatically. Map page already fills `100dvh - 80px`; height calc updated to also subtract the safe-area inset so the map still reaches the bottom nav.
- `src/routes/map.tsx`: remove the now-redundant `top-0` reliance — the floating top stack (`SearchBox`, category chips, layer toggle) inherits the inset. Keep the existing `p-3` for breathing room.
- `src/routes/__root.tsx`: add `viewport-fit=cover` to the viewport meta if not already present, so `env(safe-area-inset-*)` actually resolves on iOS.

## 2. Drop-pin on the Map page

Reuse the existing `LocationPickerSheet` (already used on `/create`) so behaviour is identical.

- Add a floating "Drop a pin" FAB on `/map`, bottom-right above the bottom nav (offset by `env(safe-area-inset-bottom) + 96px`), using the `MapPin` icon and primary gradient.
- Tapping it opens `LocationPickerSheet` seeded with the current map center (`search.lat`, `search.lng`).
- On confirm:
  - If the user is signed in → navigate to `/create?lat=…&lng=…&country=…&city=…&destination=…&place=…` so they can attach a photo/video to the dropped pin. `create.tsx` already reads form state from local state; extend it to hydrate from these query params on mount (only when the fields are empty).
  - If signed out → route to `/login?redirect=/create?lat=…&lng=…` (existing redirect pattern).

## Files touched

- `src/components/layout/BottomNav.tsx` — apply safe-area inset top to `MobileShell` wrapper.
- `src/routes/__root.tsx` — ensure `viewport-fit=cover`.
- `src/routes/map.tsx` — add Drop-pin FAB, wire `LocationPickerSheet`, navigate to `/create` on confirm. Adjust map height calc for the new top inset.
- `src/routes/create.tsx` — read optional `lat/lng/country/city/destination/place` from search params and prefill empty fields.

## Out of scope

- Saving a pin without attaching media (no "anonymous pins" table).
- Reordering category chips / changing the search box visuals beyond the inset fix.
- Re-theming the layer switcher.
