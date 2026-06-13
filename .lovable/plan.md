## Problem

On `/map`, there is a cream band between the status bar (19:30) and the globe, and the search/filter chips sit below that band instead of directly under the time.

Cause: in `src/routes/map.tsx`, the map container is sized as `h-[calc(100dvh-env(safe-area-inset-top))]`, so the map starts *below* the status-bar safe area and the `MobileShell`'s page background (cream) shows through above it. The filter overlay is anchored to the top of that shorter map area, so it also sits below the cream strip.

## Fix (single file: `src/routes/map.tsx`)

1. Change the map wrapper from `h-[calc(100dvh-env(safe-area-inset-top))]` to `h-dvh` so the Mapbox canvas fills the full viewport edge-to-edge under the status bar — kills the cream strip.
2. Keep the top filter overlay's existing `pt-[max(env(safe-area-inset-top),0.75rem)]` so the search box, layer toggle, "X here" chip, and category chips render flush under the time/status bar with a small safe-area gap.

No changes to routing, data, BottomNav, MobileShell, or other screens.
