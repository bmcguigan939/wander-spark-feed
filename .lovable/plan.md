## Plan

1. **Make drop-pin use the same working map path as current location**
   - Replace the separate drop-pin map instance with the already-rendered map view underneath the picker overlay.
   - When “Drop a pin” opens, keep the main `/map` Mapbox canvas visible instead of mounting a second Mapbox canvas that can render blank.
   - Show the draggable pin, search, current-location, close, and confirm controls as an overlay on top of that working map.

2. **Keep the selected pin state synced with the main map**
   - On opening drop-pin, initialize the pin from the current map/search coordinates.
   - Tapping the map or dragging the pin updates the selected coordinates.
   - Search result and current-location actions move the main map and update the pin.

3. **Fix bottom bar visibility on mobile**
   - Move the picker confirmation area above the app bottom nav with safe-area-aware spacing.
   - Keep the app bottom nav visible when using drop-pin, while keeping the picker’s “Confirm location” panel readable and tappable.

4. **Fix top controls clipping**
   - Add mobile-safe top padding to the drop-pin overlay and constrain the search row so it does not run under browser/device chrome.
   - Keep category/filter chips horizontally scrollable so the Travel chip remains reachable.

5. **Verify behavior**
   - Test `/map` at phone viewport.
   - Open “Drop a pin” and confirm the base map remains visible.
   - Check current location still recenters the map.
   - Confirm the bottom nav and confirmation controls are both visible and not overlapping.