# "Map" chip on every feed video

Add a small Map button to `VideoCard` so users on the For-You/Following feed can jump straight to that video's spot on `/map` — same behaviour as the playlist's top-left Map button, but inline on each card.

## Changes

**1. `src/lib/feed.functions.ts`**
- Add `lat?: number | null; lng?: number | null` to the `FeedVideo` type.
- Add `lat,lng` to the column lists in every `.select(...)` that returns FeedVideo rows (lines 57, 348, 548, 582, 621). `getVideosByIds` already includes them.

**2. `src/components/feed/VideoCard.tsx`**
- In the chip row at line ~435 (next to the destination/budget/tag chips), render an extra `<Link>` chip when `video.lat != null && video.lng != null`:
  - `to: "/map"`, `search: { lng, lat, zoom: 14, layer: "both", cat: "all" }`
  - Same pill styling as the destination chip (`rounded-full bg-white/15 px-2.5 py-1 text-[11px] backdrop-blur hover:bg-white/25`).
  - Icon: existing `MapPin` (already imported), label "Map".
- Place it as the first chip so it's easy to thumb.

If a video has no coordinates, no chip renders (no broken link, no world-zoom fallback at the card level).

## Out of scope
- The big top-left Map button on `/feed/playlist` (already done last turn).
- Changing the destination chip's existing link to `/destinations/...` — it stays a separate affordance.
- Map fly-to animation; `/map` already eases to the URL-driven `lng/lat/zoom`.
