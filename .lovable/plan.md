I found the remaining broken screen is the create/upload location picker, not the newer /map drop-pin overlay. It still mounts its own full-screen Mapbox instance (`LocationPickerSheet`), which is the one shown in your screenshot with “No location selected” and blank tiles.

Plan:
1. **Fix the create-flow picker map rendering**
   - Rework `LocationPickerSheet` so the map is a stable fixed full-screen layer instead of an absolutely positioned map inside a flex panel.
   - Force Mapbox to resize after open/load and after the first animation frame so Safari/mobile preview paints tiles reliably.
   - Keep using the same working `streets-v12` style and token.

2. **Make drop-pin work immediately**
   - Seed a default selected pin at the map center when there are no existing coordinates, instead of leaving “No location selected”.
   - Let users move the pin by tapping the map or dragging the marker.
   - Keep the current-location button behavior, but make it update the pin and re-center the map.

3. **Fix bottom bar visibility/overlap**
   - Move the confirm panel above the phone/browser bottom toolbar using safe-area-aware spacing.
   - Keep the panel compact and ensure the confirm button is fully visible.
   - Ensure the picker’s close/location buttons stay visible at the top and don’t run under the device/browser chrome.

4. **Verify on mobile preview**
   - Test the create location picker at a phone viewport.
   - Confirm the map tiles render before tapping current location.
   - Confirm the pin, confirm button, and bottom area are visible and usable.