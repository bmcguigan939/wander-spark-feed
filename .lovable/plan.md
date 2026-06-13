## Goal
Maximize map screen real estate: float the bottom nav over content (transparent, pill-style), let the map fill the full viewport, raise the "Drop a pin" FAB above the floating nav, and stop the top filter row from being clipped on narrow screens.

## Changes

### 1. `src/components/layout/BottomNav.tsx` — floating, transparent nav
- `BottomNav` becomes a `fixed` bar (no longer `sticky`), centered with `left-1/2 -translate-x-1/2`, sitting `bottom-[max(env(safe-area-inset-bottom),0.5rem)]`.
- Wrap the `<ul>` in a rounded pill: `rounded-full border border-border/40 bg-background/55 backdrop-blur-2xl shadow-lg shadow-black/30`, with tighter padding (`px-2 py-1.5`).
- Drop the full-width `bg-background/80` shell so the map shows through behind/around the pill.
- `MobileShell`: remove the reserved space at the bottom (nav is now overlay). Keep top safe-area padding. Add `paddingBottom` of `calc(env(safe-area-inset-bottom) + 88px)` ONLY for non-map pages via a prop, or simpler: keep `min-h-dvh` and let each page decide. To avoid breaking other pages, add a `pb-[calc(env(safe-area-inset-bottom)+88px)]` to `<main>` so scrollable pages don't hide content under the floating pill. Map page will override by using absolute positioning inside its own container.

### 2. `src/routes/map.tsx` — full-bleed map
- Container becomes `h-[100dvh] w-full` (no longer subtracts 80px for nav, since nav floats). Top safe-area handled by inner control padding.
- To negate the global `pb-[…+88px]` from `MobileShell`, wrap the map in a div with `-mb-[calc(env(safe-area-inset-bottom)+88px)]` OR introduce a `MobileShell` `fullBleed` prop that skips the bottom padding. Use the prop approach for clarity: `<MobileShell fullBleed>`.
- Move "Drop a pin" FAB up so it clears the floating nav: `bottom-[calc(env(safe-area-inset-bottom)+96px)]`. Keep `left-4`.
- Move "Search this area" button up similarly (`bottom-[calc(env(safe-area-inset-bottom)+150px)]`).
- Move Mapbox `NavigationControl` (zoom +/-) to avoid the FAB stack — already `bottom-right`; nudge with CSS to sit above safe area (add a small wrapper or use map padding). Acceptable to leave as-is if it doesn't collide.

### 3. `src/components/map/CategoryChips.tsx` — prevent right-edge clip
- Add right padding `pr-3` and `scroll-pl-3` so the last chip ("Travel") isn't flush against the viewport edge when scrolled. Add `snap-x snap-mandatory` + `snap-start` on items for nicer scrolling.
- No other visual changes.

### 4. Top filter stack in `src/routes/map.tsx`
- Current row containing layer toggle (`Both / Videos / Deals`) and "N here" pill is fine but the layer toggle's `2` badge in the screenshot is actually the leftover CategoryChip overlap caused by the chips row not having enough bottom spacing. Increase `gap-2` to `gap-2.5` and ensure the layer-toggle row sits cleanly under the chips. No structural change.

## Out of scope
- Restyling chip colors, search box, or layer switcher.
- Changing nav icon set, labels, or routes.
- Any backend/data changes.

## Technical notes
- `MobileShell` gets an optional `fullBleed?: boolean` prop. When true, skip the bottom padding (used by `/map`). All other pages get default padding so content isn't hidden behind the floating pill.
- Use `fixed` positioning (not `sticky`) for the nav so it overlays the map regardless of scroll container height.
