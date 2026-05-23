## Make the live feed show recent uploads

### Why videos aren't showing

Your 4 newly-reconciled videos are all in the database as `status=ready`, `is_draft=false`, `is_hidden=false` — so the feed query **does** include them. But the home feed uses `getForYouFeed`, which scores each video by:

- engagement (likes, saves, comments, views) — weighted heavily
- freshness — modest weight
- "fresh native upload" boost of **+12**, but it **only applies if `mux_playback_id` is set**

The 3 most-recent uploads from your account are TikTok/Instagram **link cards** (`source_platform=tiktok/instagram`, no `mux_playback_id`), so they get no upload boost. The seeded demo videos with hundreds of fake likes outrank them and push them off the first 20 results.

### Fix (scope: feed ranking only)

1. **`src/lib/feed.functions.ts` → `isFreshNativeUpload`** — broaden to "fresh upload": any video uploaded in last 7 days whether it's a Mux native upload OR a creator-posted cross-platform link card (`mux_playback_id` present OR `source_platform` set). Demo seeds without either still don't get the boost.
2. **`scoreVideo`** — bump the new-upload boost from `+12` to `+18` and dampen engagement weight from `1.2` to `0.7` so 7-day-fresh creator uploads consistently surface above older seeded high-engagement rows.
3. **Add a `Latest` tab next to `For You` / `Following`** on `src/routes/index.tsx` that calls `getFeed` with a new pure-chronological order. Update `fetchFeedRows` in `feed.functions.ts` to sort by `created_at DESC` only (drop the `like_count` primary sort) — this becomes the deterministic "all recent videos from creators" view you described.
4. Keep personalization (taste vector, follows, tag/country affinity) intact — `For You` still benefits, it just no longer buries brand-new content.

### Out of scope

- No schema or RLS changes (data is already visible; this is a ranking + UI tab issue).
- No changes to upload, Mux reconcile, or Studio flows.
- No new personalization signals — those stay as a follow-up once there's more user activity to learn from.

After this, all 4 recent videos appear at the top of the new **Latest** tab immediately, and within the top results of **For You** for users who haven't built strong taste signals yet.
