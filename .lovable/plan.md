## Phase 1 — Continue: Mux upload, webhook, and remaining functional pages

Building on the foundation already in place (DB, auth, feed shell, design system), this round wires up the full video lifecycle and fills out the remaining tabs so the app is usable end-to-end.

### 1. Mux integration (server-only)

**Secrets**: request `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET` via the secrets tool before writing code.

**`src/lib/mux.functions.ts`** — server functions, never called from client directly:
- `createDirectUpload()` — protected by `requireSupabaseAuth`; verifies caller has `creator` role via `has_role`; calls Mux SDK to mint a signed Direct Upload URL; inserts a `videos` row with `status = 'uploading'` and the returned `upload_id`; returns `{ uploadUrl, videoId }`.
- `finalizeVideoMetadata({ videoId, title, description, destination, country, city, activity_tags, budget_tag })` — protected; updates the creator's own row with form metadata.
- `becomeCreator()` — protected; inserts `('creator')` into `user_roles` for the current user (idempotent).

**`src/routes/api/public/mux-webhook.ts`** — TanStack server route:
- Verifies `Mux-Signature` HMAC against `MUX_WEBHOOK_SECRET` (timing-safe).
- On `video.asset.ready`: looks up the video by `mux_upload_id` (or `mux_asset_id`), sets `status = 'ready'`, `mux_playback_id`, `thumbnail_url` (Mux image URL), `duration_sec`.
- On `video.asset.errored`: sets `status = 'errored'`.
- Uses `supabaseAdmin` (RLS bypass) since webhook has no user session.

**DB migration**: add `mux_upload_id text` to `videos` if missing; add index on it.

### 2. Create flow (`/create`)

- Guarded: if not signed in → redirect `/login`. If signed in but not a creator → "Become a creator" CTA that calls `becomeCreator()`.
- Two-step UI:
  1. **Pick file** → call `createDirectUpload()` → PUT file to returned `uploadUrl` with `XMLHttpRequest` for progress bar.
  2. **Add details** form (title, description, destination, country, city, activity tags chips, budget tag select) → calls `finalizeVideoMetadata()` → redirects to `/profile` with a "processing" toast.
- Mobile-first: full-screen, large drop zone, sticky bottom CTA.

### 3. Feed interactions (`/`)

Wire the right-rail buttons that are currently visual-only:
- **Like / Save toggle** — server fns `toggleLike` / `toggleSave` (auth required); optimistic update via React Query.
- **Add to collection** — sheet listing user's collections + "New collection" inline; server fn `addToCollection`.
- **Share** — `navigator.share` with fallback to copy link.
- **Follow** on creator avatar tap-through (lives on profile page).
- Unauthenticated taps open a "Sign in to continue" sheet that links to `/login`.

### 4. Collections (`/collections`, `/collections/$id`)

- `/collections` — grid of user's collections (cover thumb, title, count). FAB "+" opens create sheet.
- `/collections/$id` — header (title, description, visibility toggle, edit, delete) + 3-col video thumb grid. Tap thumb → opens single-video view at `/?v=<id>` (feed scrolled to that video). Long-press → remove from collection.
- Server fns: `listMyCollections`, `getCollection(id)`, `createCollection`, `updateCollection`, `deleteCollection`, `removeFromCollection`.

### 5. Profile (`/profile`, `/u/$username`)

- `/profile` (own): avatar, display name, bio, role badges, edit profile sheet, tabs (My videos / My collections / Liked), sign-out, "Become a creator" button if not yet a creator.
- `/u/$username` (public): same minus edit/liked, plus Follow/Unfollow button (server fn `toggleFollow`) and follower/following counts.
- Server fns: `getMyProfile`, `updateMyProfile({ display_name, bio, avatar_url })`, `toggleFollow(creatorId)`, `getMyVideos`, `getMyLikedVideos`.
- Avatar upload uses existing `avatars` storage bucket (public).

### 6. Search (`/search`)

- Sticky search bar + filter sheet (country, activity tag chips, budget tag, sort: trending/recent).
- Tabs: Videos · Creators · Collections.
- Server fn `searchAll({ q, filters, tab, cursor })` uses Postgres FTS over `videos.search_tsv` and `profiles.username || display_name`. Debounce 250ms on the client.
- Empty state with trending tags pulled from a simple aggregate.

### 7. Auth polish

- `_authenticated.tsx` pathless layout that redirects to `/login` if no session — wrap `create`, `collections`, `profile`.
- `/login` already exists; add `/signup` route (or keep toggle inside `/login`, which it already does).

### 8. Wiring & misc

- Confirm `attachSupabaseAuth` is in `src/start.ts` `functionMiddleware` (already done — verify).
- Add `onAuthStateChange` root listener (already done — verify).
- Ensure root `Outlet` is present (it is).
- Mobile bottom nav already exists; show it on all top-level routes, hide on `/login` and immersive feed.

### Technical notes

- Use `@mux/mux-node` server-side only (already installed).
- React Query for all server-fn calls; `useServerFn` from `@tanstack/react-start` in components for mutations.
- All new tables/columns via `supabase--migration`; all new server fns follow the `.functions.ts` + `requireSupabaseAuth` pattern documented in the server-side knowledge file.
- Mux webhook URL to register in Mux dashboard: `https://project--144ee3b9-80e0-4ec8-883d-e0d5686cb4a1.lovable.app/api/public/mux-webhook` (I'll surface this after deploy).

### What I need from you before building

1. Approve this plan.
2. Provide **Mux** credentials when prompted (Token ID, Token Secret, Webhook Signing Secret). I'll request via the secure secrets form.
3. Sample seed videos can come later — flow works with creator uploads.

### Out of scope (still Phase 2+)

AI tagging/transcription/search, in-app editor, deals/codes/Stripe, business portal, admin dashboard, map view, destination pages, PWA install.
