## What's happening

Two bugs combine to produce the "tap Like → jumps off the video" experience from a shared link.

### Bug 1 — Shared link doesn't open the shared video

`VideoCard.share()` (src/components/feed/VideoCard.tsx:57) builds the share URL as `/?v=<videoId>`. But `src/routes/index.tsx` (the destination) **never reads `?v=`** — it just renders the default For You feed and scrolls to index 0. So the visitor lands on *a different* video than the one that was shared. The only route that handles a starting video id is `src/routes/feed.playlist.tsx`, and shares don't point there.

### Bug 2 — Tapping Like/Save reshuffles the feed and loses position

In `VideoCard.tsx` the Like and Save mutations do:

```ts
onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
```

`src/routes/index.tsx` keys the feed as `["feed", tab, user?.id]`, so that invalidation refetches the whole feed. `getForYouFeed` re-ranks on every call, so the video list order changes underneath the user. The `IntersectionObserver` then snaps `activeIdx` to whatever is visible after the re-render, which is typically a different video — exactly the "jumped off the video to the screen" symptom (the red YouTube-placeholder card in the screenshot is the new top-ranked video, not the one they were watching).

The feed also tries to autoplay the new `active` card while the old MuxPlayer instance unmounts, which is why the player area looks frozen on the play overlay.

## Fix

### 1. Honor `?v=` on the home feed

Edit `src/routes/index.tsx`:

- Add `validateSearch` for `{ v?: string (uuid) }`.
- Read `Route.useSearch()` for `v`.
- When `v` is present and the feed has loaded, find that video's index in `videos`, `scrollIntoView({ behavior: "auto" })` on its container, and `setActiveIdx(idx)` — mirroring the pattern in `src/routes/feed.playlist.tsx`.
- If `v` is set but isn't in the first page of For You, fetch it via `getVideosByIds({ ids: [v] })` and prepend it to the rendered list (so the shared video always shows first, regardless of ranking). This keeps the existing For You feed below as the continuation.
- Update `<head>` to set the page title to the shared video's title when `v` is set, so the share preview matches.

### 2. Stop Like/Save from reshuffling the feed

Edit `src/components/feed/VideoCard.tsx`:

- Replace `qc.invalidateQueries({ queryKey: ["feed"] })` in `likeM` and `saveM` with an **optimistic cache update** via `qc.setQueryData`:
  - `onMutate`: snapshot current feed cache for any key starting with `["feed", ...]`, increment/decrement `like_count` (or `save_count`) on the matching video, and flip a local `liked`/`saved` flag.
  - `onError`: roll back to the snapshot and toast the error.
  - `onSettled`: **do not** invalidate `["feed"]`. If freshness matters, invalidate a narrower per-video key (e.g. `["video", video.id]`) that the feed doesn't consume.
- Same treatment for `toggleSave`.
- Keep the heart/bookmark icon filled state driven by the optimistic value so the UI feels instant.

This keeps the user pinned to the video they're watching and removes the unmount/reload of the active MuxPlayer.

### 3. Small correctness follow-ups

- In `share()`, when the current page already encodes a `v` (i.e. we're on a shared-video deep link), still build the canonical `/?v=<id>` URL (it already does — just verify after the routing change).
- Add `scroll-snap-stop: always` is already in `feed-scroll`; no change.

## Out of scope

- The SmartDealsSheet / upload polling work from earlier turns.
- Backend ranking changes to `getForYouFeed` — we're only stopping it from being re-called on Like/Save.
- Reworking `feed.playlist.tsx` (it already handles a starting video correctly).

## Files touched

- `src/routes/index.tsx` — add `validateSearch`, read `?v=`, fetch + prepend shared video, scroll to it on load.
- `src/components/feed/VideoCard.tsx` — optimistic Like/Save, drop `["feed"]` invalidation.
