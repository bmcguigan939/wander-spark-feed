# Make collection thumbnails playable

## Problem
On the collection detail page (reached by tapping a collection), videos appear as a static grid of thumbnails — they aren't clickable, so users can't preview the videos they've saved. The same issue exists on the public creator profile page (`/u/$username`).

A playlist player already exists at `/feed/playlist?ids=...&start=...` (used elsewhere), so this is purely a wiring change.

## Changes

1. **`src/routes/collections.$id.tsx`** — Wrap each thumbnail tile in a `<Link>` to `/feed/playlist` with:
   - `search.ids` = all video IDs in the collection (in current order)
   - `search.start` = the tapped video's ID
   
   Keep the small "X" remove button on top of each tile, but stop its click from propagating to the link so removal still works without launching the player.

2. **`src/routes/u.$username.tsx`** — Same treatment for the 3-column videos grid on the profile page: each thumbnail becomes a `<Link>` into `/feed/playlist` seeded with all of that creator's video IDs and `start` set to the tapped video.

## Out of scope
- No changes to the collections list page (`/collections`) — those cards already link to the collection detail.
- No backend / data changes — `/feed/playlist` already accepts up to 50 IDs.
- No styling changes beyond what's required to keep the link behaving as a tile.
