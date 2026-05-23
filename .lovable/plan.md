## Goal

Two related fixes:

1. **Following feed** must always show the newest videos from creators a user follows, on top — regardless of `bumped_at` from the recent edit-resurface change.
2. **Saved videos** must actually live in the profile "Saved" tab as a grid of the user's saved videos (today the tab just links to `/collections` and shows nothing).

## Current behaviour

- `fetchFeedRows` (used by both Latest and Following) now orders by `bumped_at desc nulls last, created_at desc`. Side effect: a brand-new upload from a followed creator can be ranked below an older bumped video. That contradicts the Following contract.
- For-You pool is also ordered by `bumped_at desc nulls last, created_at desc` and capped at 150 — so bumped rows can crowd out the newest pure uploads.
- Profile "Saved" tab renders `<Link to="/collections">Open collections →</Link>` instead of the user's saved videos. `getMyProfile` doesn't return saves.

## Changes

### 1. Feed ordering (`src/lib/feed.functions.ts`)

- `fetchFeedRows`: revert to a single `.order("created_at", { ascending: false })`. Latest = newest uploads. Following = newest uploads from followed creators. This restores the "always see their newest" guarantee.
- `getForYouFeed` candidate pool: fetch two pools and merge before scoring, so bumped older videos still get re-considered:
  - Pool A: top 120 by `created_at desc` (fresh uploads).
  - Pool B: top 60 by `bumped_at desc` where `bumped_at is not null` (recently edited / new-deal videos).
  - Dedupe by `id`, then run through `scoreVideo` as today. `scoreVideo` already uses `effectiveTime()` so bumped rows still get the freshness restart and the +18 fresh-upload boost.
- Keep `bumped_at` in all selects and the `FeedVideo` type. Keep `seenVideoIds` re-admission logic (a liked video that was bumped after the like can resurface in For-You).

### 2. Saved videos on profile (`src/lib/profile.functions.ts`, `src/routes/profile.tsx`)

- In `getMyProfile`, add a parallel query that mirrors the existing `liked` shape:
  - `supabase.from("saves").select("video_id, videos!inner(id,title,thumbnail_url,mux_playback_id,like_count,creator_id)").eq("user_id", userId).order("created_at", { ascending: false }).limit(60)`
  - Return as `saved: [...]` on the response.
- In `src/routes/profile.tsx`:
  - Replace the `tab === "collections"` branch that links to `/collections` with `<Grid items={data.saved as any} emptyMsg="No saves yet — tap the bookmark on a video to save it." />`.
  - Keep the "Saved" label and Bookmark icon; the tab key stays `"collections"` (no need to refactor the tuple).
  - Optionally append a small secondary link under the grid: "Manage collections →" pointing to `/collections` so the existing collections feature stays reachable.

### 3. Cache invalidation

- `toggleSave` in `src/lib/interactions.functions.ts` already exists. Add `qc.invalidateQueries({ queryKey: ["my-profile"] })` in `VideoCard`'s `saveM.onSettled` so the Saved tab reflects new saves without a manual reload. (Single-line addition.)

## Out of scope

- Pagination / infinite scroll on the Saved tab (limit 60 matches Liked).
- Collections feature redesign — keep `/collections` route as-is.
- Following-tab pagination (already non-paginated like Latest).

## Files touched

- `src/lib/feed.functions.ts` — restore plain `created_at` ordering in `fetchFeedRows`; add Pool A + Pool B merge in `getForYouFeed`.
- `src/lib/profile.functions.ts` — return `saved` alongside `liked`.
- `src/routes/profile.tsx` — render saved grid in the Saved tab.
- `src/components/feed/VideoCard.tsx` — invalidate `["my-profile"]` after save toggle.