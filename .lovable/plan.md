Update the map controls so the category filter no longer runs off-screen.

Plan:
1. Move the category chips from above the Both / Videos / Deals bar to a new row underneath it.
2. Keep the Both / Videos / Deals bar and the “37 here” count on the same row.
3. Make the category row responsive:
   - allow horizontal scrolling when needed,
   - size chips compactly on small screens,
   - prevent the last Travel chip from being clipped off-screen.
4. Improve readability of unselected filter text by using solid foreground text instead of muted translucent text.

Technical details:
- Edit `src/routes/map.tsx` to reorder the controls: search box, content-type row, category row.
- Adjust the wrapper widths/min-width behavior so filter rows respect the viewport.
- Edit `src/components/map/CategoryChips.tsx` only if needed for chip spacing and text contrast.