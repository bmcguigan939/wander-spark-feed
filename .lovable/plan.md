## Plan

1. **Fix the white/blank map tiles**
   - Replace the Mapbox `standard` style with a stable classic style (`mapbox://styles/mapbox/streets-v12`) for the default map layer.
   - Use the same default style in the drop-pin location picker so both map views render consistently.
   - Keep the existing resize-on-load safeguard for the picker.

2. **Stop the app bottom nav from covering the drop-pin sheet**
   - Raise the drop-pin picker above the app nav by increasing its overlay z-index.
   - Convert the picker bottom area into a floating bottom action panel with safe-area padding so **Confirm location** is fully visible and not trapped behind the nav.

3. **Fix the top travel filter/search layout**
   - Give the top map controls stronger mobile-safe spacing from the status bar/notch.
   - Constrain the horizontal category chips so the “Travel” filter stays scrollable inside the viewport instead of appearing off-screen.
   - Keep the controls compact so the map still feels large.

4. **Lower and lighten the bottom navigation on the map**
   - Make the bottom nav more transparent and slightly lower using safe-area-aware positioning.
   - Ensure map floating buttons sit above it with enough clearance.

5. **Verify in mobile preview**
   - Check `/map` at phone width.
   - Open **Drop a pin**.
   - Confirm map tiles render, top controls are fully visible, and the confirm button/bottom nav no longer overlap.