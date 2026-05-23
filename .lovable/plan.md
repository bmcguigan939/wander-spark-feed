## Goal

When a creator edits a published video (new title/description/tags/location/budget) or attaches/detaches a business deal on an old upload, that video should re-surface in the For-You feed — even for users who already liked or saved it — so they see the new deal CTA and updated info.

Today: ranking uses `created_at` only, and `buildAffinity()` excludes any video the user has liked or saved via `seenVideoIds`. An edited 3-month-old video therefore stays buried and never re-appears for past likers.

## Approach

Introduce a single `bumped_at` timestamp on `videos` that ranking treats as the "effective freshness time", and bypass the seen-filter when a video was bumped after the user's interaction.

### 1. DB migration

- Add `videos.bumped_at timestamptz` (nullable).
- Index `(bumped_at desc nulls last)` to support ordering.
- Backfill: leave NULL (means "never re-bumped" — falls back to `created_at`).

### 2. Server functions — set `bumped_at = now()`

In `src/lib/studio.functions.ts` and `src/lib/video-deals.functions.ts`, add `bumped_at: new Date().toISOString()` to the `videos` update payload (or a follow-up update keyed by `video_id`) in:

- `updateVideoMetadata` (already exists, just add the field)
- `attachDealToVideo` → bump the affected video
- `detachDealFromVideo` → bump (so a removed deal also refreshes the card)

Out of scope for bumping: thumbnail-only changes, view-count writes, scheduled publishes (those already use `published_at`).

### 3. Feed ranking changes (`src/lib/feed.functions.ts`)

- `fetchFeedRows` and `getForYouFeed` candidate pool: `order by greatest(coalesce(bumped_at, created_at), created_at) desc`. Implement via a new view OR by ordering on `bumped_at desc nulls last, created_at desc` (good enough — bumped rows float to the top, untouched rows keep current order).
- `scoreVideo`: replace `hoursSince(v.created_at)` with `hoursSince(max(bumped_at, created_at))` so freshness decay restarts on edit.
- `isFreshUpload`: same — treat a recent bump as a fresh upload for the +18 boost.
- `buildAffinity` / `seenVideoIds`: query `likes.created_at` and `saves.created_at`. A video is only "seen" (filtered out) if `interaction.created_at >= max(video.bumped_at, video.created_at)`. If the video was bumped after the user liked it, allow it back into the pool. Add `bumped_at` to the `videos` select used for affinity building.
- Type: add `bumped_at: string | null` to `FeedVideo` and include in all `select(...)` strings.

### 4. Cache invalidation

`updateVideoMetadata` and `attachDealToVideo`/`detachDealFromVideo` already invalidate `["feed"]` from the client. No new wiring needed — the next feed fetch will pick up the bump.

## Out of scope

- Notifications/badging past likers ("a creator you liked added a new deal") — separate feature.
- Bumping on profile-level changes (avatar, bio).
- Time-decay tuning beyond restarting from the bump timestamp.

## Files touched

- new migration: add `bumped_at` + index
- `src/lib/studio.functions.ts` — set `bumped_at` in `updateVideoMetadata`
- `src/lib/video-deals.functions.ts` — set `bumped_at` in attach/detach
- `src/lib/feed.functions.ts` — type, selects, ordering, scoring, seen-filter logic