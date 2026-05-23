## Two bugs to fix

### 1. Tapping Like on a linked (non-Mux) feed video opens the source URL

**Cause** — in `src/components/feed/VideoCard.tsx`, when a video has no `mux_playback_id`, the entire card background is wrapped in `<a href={source_url} target="_blank">` covering `absolute inset-0`. The right-rail action buttons (Like / Comment / Save / Share / +Collection) and the bottom overlay sit as sibling absolutely-positioned elements without an explicit `z-index`. On iOS Safari taps frequently fall through to the underlying `<a>`, which opens YouTube in a new tab instead of liking the video.

**Fix** — keep the link behavior, but make the interactive overlays unambiguously on top and click-isolated:
- Replace the full-area `<a>` with a regular `<div>` background. Move the "open original" affordance to (a) the centered round Play button (make it a real `<a>` / button), and (b) the existing platform pill at top-left (already a separate `<a>`). This removes the giant link layer covering the whole tile.
- Add `z-10` to the right-rail action column and to the bottom overlay so they always sit above the media layer.
- Add `e.stopPropagation()` to all `Action` button `onClick`s (Like / Comment / Save / Share) and the `+ Collection` button, so taps never bubble to background handlers.

No change to Mux video cards (tap-to-mute behavior preserved).

### 2. Bottom nav appears mid-screen on `/destinations/$country/$city`

**Cause** — `BottomNav` in `src/components/layout/BottomNav.tsx` is `position: fixed; bottom: 0`. On long scroll pages inside the Lovable preview iframe / iOS Safari, the destination page exceeds the viewport and the fixed nav can detach (visible in IMG_6156 — nav floats over the video grid mid-page). The feed page doesn't hit this because it uses an internal `h-dvh` scroll container.

**Fix** — switch `MobileShell` to a flex column where the nav is `sticky bottom-0` inside the scroll context, not `fixed`:
- `MobileShell`: keep `min-h-dvh flex flex-col`, drop `pb-20` from `<main>` (no longer needed), let the nav participate in normal flow.
- `BottomNav`: change `fixed bottom-0 left-0 right-0` → `sticky bottom-0 w-full`. Keep the `pb-[env(safe-area-inset-bottom)]`, blur, and shadow.

Sticky bottom keeps the nav visually pinned to the viewport bottom while scrolling, and naturally sits at the document end so it never floats mid-content. Verified the feed page still works since it manages its own `h-dvh` scroller inside `MobileShell`.

## Files changed
- `src/components/feed/VideoCard.tsx` — restructure linked-video card, add z-index + stopPropagation on action buttons.
- `src/components/layout/BottomNav.tsx` — switch `fixed` → `sticky`, remove `pb-20` spacer from `MobileShell`.

## QA after build
- Feed: tap Heart on the YouTube card → like count increments, no new tab.
- Feed: tap centered Play / top-left YouTube pill → opens source URL in new tab.
- Destinations city page: scroll to bottom; nav stays pinned at viewport bottom, never mid-page.
- Feed page itself: nav still visible at bottom (inner `h-dvh` scroller unaffected).
