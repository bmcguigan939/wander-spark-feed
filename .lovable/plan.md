## What's broken

**1. The "4" on the bookmark drifts upward on every tap**
The right-rail icons are Like, Comments, **Save (the 4)**, Share. Server-side `toggleLike` / `toggleSave` correctly toggle the row in the DB. The bug is purely client-side: the optimistic update in `VideoCard.tsx` always applies `+1`, regardless of whether the tap is a save or an un-save. So tap → +1, tap again → +1 (should be −1), etc. The number only "corrects" itself on a full refetch.

**2. iOS Safari's bottom bar shows on Travidz, not on Instagram**
That's iOS browser chrome — it disappears only when the app is launched from the Home Screen (standalone PWA mode). Our `manifest.webmanifest` already has `"display": "standalone"`, so the capability exists. The gap is UX: we don't actively tell iOS users "Add Travidz to your Home Screen to get the full-screen, app-like experience." The existing `PWAInstallPrompt` component is wired for Android's `beforeinstallprompt` event (which iOS Safari doesn't fire), so iOS users never see anything.

---

## Fix plan

### A. Correct optimistic counts for Like + Save

1. **Return viewer state from the feed APIs.** Extend `FeedVideo` with `viewer_liked: boolean` and `viewer_saved: boolean`. Populate them in `getForYouFeed`, `getFeed`, `getFollowingFeed`, and `getVideosByIds` by joining/loading the current user's rows from `likes` and `saves` for the returned video ids (single batched query per feed page, no N+1). When unauthenticated, return `false`.

2. **Use viewer state to drive the toggle direction in `VideoCard.tsx`.**
   - Track a local `liked` / `saved` boolean seeded from `video.viewer_liked` / `video.viewer_saved`.
   - On tap: flip the local boolean, and apply `+1` or `−1` to the count based on the previous value (not always `+1`).
   - Patch the same delta into every cached feed entry (existing `patchFeeds` helper, just pass the signed delta).
   - On error, roll back both the boolean and the count.

3. **Invalidate `["feed"]` and `["shared-video"]` on settle** so the source of truth re-syncs without disturbing scroll position (the feed already preserves the active card via `data-idx`).

### B. iOS "Add to Home Screen" prompt

1. **Detect iOS Safari** (UA-based; iPad on iPadOS too) **and standalone mode** (`window.navigator.standalone === true` or `display-mode: standalone` media query).
2. If the user is on iOS Safari **and** not already standalone **and** hasn't dismissed the prompt in the last 14 days (localStorage flag), show a one-time bottom sheet on the feed: *"Get the full-screen Travidz experience — tap the Share icon ⬆️ then 'Add to Home Screen'."* with a small illustration of the Share → Add to Home Screen flow and a "Don't show again" dismiss.
3. Add an "Install app" entry inside `Settings` so users who dismissed can re-open the instructions.
4. Leave the existing Android `beforeinstallprompt` flow alone — just extend the same component to also handle iOS.

### C. Verify

- Tap save on a fresh video, count goes 4 → 5, tap again → 4, refresh page → still 4. Repeat for like.
- Open the preview on iPhone Safari → see the install prompt once; tap dismiss → it's gone for 14 days; tap Settings → "Install app" → instructions reappear.
- After "Add to Home Screen", relaunch from the icon → no Safari top/bottom bars, identical to Instagram's chrome-free view.

---

## Technical notes

- The `likes` and `saves` tables already exist (used by `toggleLike`/`toggleSave`); the batched viewer-state query is `select video_id from likes where user_id = $me and video_id = any($ids)` → set of liked ids. No schema change required.
- No PWA service worker is being added — manifest-only install. This keeps us inside Lovable's "no service workers in preview" guidance.
- Files touched: `src/lib/feed.functions.ts` (FeedVideo type + viewer flags in 4 server fns), `src/components/feed/VideoCard.tsx` (toggle logic), `src/components/PWAInstallPrompt.tsx` (iOS branch), `src/routes/settings.tsx` (re-open entry). No DB migration.
