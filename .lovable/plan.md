# Map: cluster videos + scroll playlist

## What exists today
- `/map` already renders pins from `getMapPins`: creator videos (with `lat/lng`), active deals, and business profiles (whose `lat/lng` is set on `profiles`).
- Co-located pins are grouped by rounded lat/lng, shown as a single marker with a count badge when `count > 1`, and tapping opens a bottom sheet with Deals / Videos / About tabs.
- Tapping a video thumbnail in the sheet currently navigates to `/?v=<id>` — but the home feed ignores `v` and just loads the For You feed, so the selected video does not open and the rest of the cluster is lost.

## Goal
1. Make the cluster count badge clearer and always visible when there are multiples.
2. When a user picks a video from a map cluster, drop them into a vertical-swipe feed scoped to **just that cluster's videos**, starting on the one they tapped, so they can scroll through them one by one.
3. Keep showing businesses-with-deals as pins (already supported); make sure deal pins remain distinct and tappable from clusters that also contain videos.

## Changes

### 1. Cluster count badge (UI polish, `src/routes/map.tsx`)
- Show the count badge for any `count >= 2` (today's threshold is fine, but enlarge it slightly and add `tabular-nums` so 2-digit counts don't clip).
- Add an `aria-label` like `"5 videos and 2 deals here — tap to browse"`.
- No data changes.

### 2. Cluster sheet → launch a scrollable video queue (`src/components/map/ClusteredSheet.tsx`)
- Keep the grid of thumbnails, but change each video tile's link from `/?v=<id>` to the new playlist route below, passing the full ordered list of video ids in the cluster and the tapped id as the start.
- Show the count prominently in the Videos tab header (already does `Videos (N)`).

### 3. New scrollable playlist route (`src/routes/feed.playlist.tsx`)
- Path: `/feed/playlist`
- `validateSearch`: `{ ids: string[] (min 1, max 50), start?: string }`
- Loads those videos in the given order via a new tiny server fn `getVideosByIds` in `src/lib/feed.functions.ts` (admin client, filter `status = 'ready'`, preserve input order, re-use existing feed-row shape so `VideoCard` works unchanged).
- Renders the same vertical-snap scroller used on `/` (lift the markup into a small `<FeedScroller videos={...} startId={...} />` shared component, or inline a near-copy — pick whichever is smaller). Scrolls to `start` on mount.
- Shows a top-left "Back to map" button that returns to `/map` preserving its last search params (use `router.history.back()` with a fallback).

### 4. Server fn (`src/lib/feed.functions.ts`)
- Add `getVideosByIds({ ids })`: validates, queries `videos` joined with `profiles` (creator), filters ready + not blocked, runs through the existing `attachMatchedDeals` and `applySocialVisibility` helpers so the playlist videos behave exactly like feed videos (matched deals + social icons respect creator settings).

### 5. Business deal pins (verify only, no code change expected)
- `getMapPins` already returns active, in-window deals filtered by `lat/lng`; the marker for clusters with deals already uses the `Tag` icon and accent color. Confirm this still works and that a cluster containing both a video and a deal still surfaces both tabs in the sheet. No migration needed.

## Out of scope
- Server-side spatial clustering (Mapbox GL supercluster). Current rounded-grid clustering is sufficient at this scale.
- Changing how businesses without deals appear — they keep their current "About" pins, deduped against deal pins as today.
- Any deal-visibility / contract logic — unchanged.

## Files touched
- `src/routes/map.tsx` — badge polish + aria.
- `src/components/map/ClusteredSheet.tsx` — video tile links to `/feed/playlist`.
- `src/routes/feed.playlist.tsx` — new route.
- `src/lib/feed.functions.ts` — new `getVideosByIds` server fn.
- (optional) `src/components/feed/FeedScroller.tsx` — extracted shared scroller if it keeps things tidy.
