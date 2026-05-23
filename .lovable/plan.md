## Problem
Right-rail buttons (like/comment/save/share/+collection) use a fixed bottom offset (`196px`). When the bottom overlay grows — extra deal card, longer caption, tags row — the rail gets covered (the "Save" 1 in the screenshot overlaps the "Book this trip" card).

## Fix — `src/components/feed/VideoCard.tsx` only

1. Add a `ref` on the bottom overlay `<div>` and measure its rendered height with a `ResizeObserver` (state: `overlayHeight`, default 0).
2. Drive the right rail's `bottom` from that measurement:
   `style={{ bottom: 'calc(env(safe-area-inset-bottom) + ' + (overlayHeight + 16) + 'px)' }}`
   so the rail always sits 16px above the overlay, regardless of how tall it grows.
3. Add `transition-[bottom] duration-200` on the rail so it slides up smoothly when deals/tags hydrate.
4. SSR-safe: skip the observer when `typeof ResizeObserver === 'undefined'`.

No changes to BottomNav, overlay markup, or any data. One file touched.
