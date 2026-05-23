# Map button returns to the video's location

Today, the "Map" pill at the top of `/feed/playlist` calls `router.history.back()` (or falls back to `/map` at world view). When a user opens a video from a map pin and taps Map, they should land back on the map zoomed to that video's location, not at world zoom and not on whatever previous page was in history.

## Change

**1. `src/lib/feed.functions.ts` — `getVideosByIds`**

Add `lat,lng` to the `.select(...)` column list so the playlist page knows where each video is. No other behavior changes; `FeedVideo` already permits these as optional fields elsewhere in the codebase.

**2. `src/routes/feed/playlist.tsx`**

Replace the `goBack` handler with a navigation that always goes to `/map` with search params derived from the currently active video:

- `lng`, `lat` — from `videos[activeIdx]` (fallback to the first video that has coords, then to default `0,20`).
- `zoom` — `14` when we have coords, otherwise `1.6` (matches map default).
- Preserve `layer: "both"` so both the video pin and any deals at the same spot are visible.

Use `useNavigate()` from `@tanstack/react-router` with `to: "/map"` and the search object — type-safe, no string interpolation. Keep the button label "Map" and the back-arrow icon.

If no videos are loaded yet (still fetching), the button stays disabled-feeling but still routes to `/map` at default zoom rather than throwing.

## Out of scope

- The map page's own "open feed" interaction (already works via `ClusteredSheet`).
- Adding a separate "Back" vs "Map" affordance — the existing single button is repurposed.
- Animating the map fly-to on arrival; react-map-gl already eases to the new `lng/lat/zoom` from the URL.
