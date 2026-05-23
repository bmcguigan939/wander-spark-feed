## What's already in place

- Tapping the heart on a creator already writes to the `follows` table (`toggleFollow` in `interactions.functions.ts`).
- The home feed already has a **Following** tab (`getFollowingFeed`) that shows the latest videos from every creator you follow. So the "always receive their latest videos on their feed" part already works — no change needed there.

## What this plan changes

The **Creators** tab on `/search` currently shows "Type to search creators." when empty, so users have no way to see or revisit who they follow. We'll turn it into a real **Following** list.

### 1. New server function — `getMyFollowing`
`src/lib/profile.functions.ts` (or new `src/lib/follows.functions.ts`):
- Protected with `requireSupabaseAuth`.
- Joins `follows` (where `follower_id = userId`) → `profiles`, returning `{ id, username, display_name, avatar_url, bio }[]` ordered by most recently followed.

### 2. Rename the tab and rewire the Creators view in `src/routes/search.tsx`
- Rename the tab label from **Creators** to **Following**. Keep the URL param value `"creators"` so existing links/bookmarks don't break (internal key stays, display label changes).
- Add a `useQuery(["my-following"], getMyFollowing)` enabled when the user is signed in and the tab is active.
- Tab count badge:
  - empty query → `Following (followingList.length)`
  - non-empty query → `Following (matches.length)` (filtered client-side from `followingList` first, falling back to the existing global `searchAllFn` only if no local matches and the user explicitly wants to discover new creators — see step 3).
- Render rules for the Following pane:
  - Signed-out → prompt to log in.
  - Signed-in + no follows yet → empty state: "You're not following anyone yet. Tap the heart on a video to follow that creator."
  - Signed-in + has follows, empty query → render the full following list (reuse the existing creator row markup).
  - Signed-in + has follows, non-empty query → filter the following list by `username` / `display_name` (case-insensitive contains).

### 3. Discover bar (small addition, keeps existing search reachable)
When the query is non-empty and zero following matches:
- Show "No one you follow matches '{q}'." plus a secondary "Search all creators" button that runs the existing `searchAllFn` and lists results below, so global creator search isn't lost.

### 4. Cache invalidation
- In the existing `toggleFollow` mutation success handler on video cards / profile page, also `queryClient.invalidateQueries({ queryKey: ["my-following"] })` so the Following list updates immediately after follow/unfollow.

## Out of scope
- No DB migration (the `follows` table and RLS already exist).
- No changes to the home Following video feed.
- No changes to `toggleFollow` itself, only to the cache keys it invalidates.
- No notification or email changes.