## Fix: Let users preview their own videos

**1. `src/routes/studio.videos.tsx`**
- Wrap each row's thumbnail in a `<Link to="/feed/playlist" search={{ ids: <all ready filtered video ids>, start: v.id }}>` so tapping the thumb plays the video.
- Keep the title/row body linking to `/studio/videos/$id` (insights) as today.
- If `derived_state === "processing"` or `status !== "ready"`, render the thumb as a non-link with a toast on tap: "Still processing — check back soon."

**2. `src/routes/studio.videos.$id.tsx`**
- Add a small "Preview" button next to the thumbnail linking to `/feed/playlist` with `{ ids: [id], start: id }`. Hidden/disabled when the video isn't ready.

**3. `src/routes/profile.tsx` (own-profile Videos tab, ~lines 590–615)**
- Wrap each tile in `<Link to="/feed/playlist" search={{ ids: items.map(x => x.id), start: v.id }}>`.
- Add `e.stopPropagation()` (and `e.preventDefault()` where needed) to the inner AI / re-run / apply-title buttons so taps on them don't trigger navigation.
- Tiles with `status !== "ready"` or no `thumbnail_url` stay non-navigating and show the same "Still processing" toast.

**Out of scope:** in-place mini player in Studio, `/u/$username` changes, SmartDealsSheet, ranking changes.
