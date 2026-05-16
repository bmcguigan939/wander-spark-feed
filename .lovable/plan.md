## Phase 1 continuation — what I'll build next

Picking up from the foundation already in place (DB, auth, feed shell). After approval I'll request the three Mux secrets (`MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET`) and then build everything below in one pass.

### 1. Mux upload pipeline (server-only)
- `src/lib/mux.functions.ts`:
  - `becomeCreator()` — adds `creator` role for current user (idempotent).
  - `createDirectUpload()` — auth-protected, creator-only; mints a Mux Direct Upload URL, inserts a `videos` row (`status='uploading'`, `mux_upload_id`), returns `{ uploadUrl, videoId }`.
  - `finalizeVideoMetadata({ videoId, title, description, destination, country, city, activity_tags, budget_tag })` — auth-protected; updates the creator's own row.
- `src/routes/api/public/mux-webhook.ts` — HMAC-verifies `Mux-Signature` against `MUX_WEBHOOK_SECRET`; on `video.asset.ready` writes `mux_asset_id`, `mux_playback_id`, `thumbnail_url`, `duration_sec`, `status='ready'`; on `video.asset.errored` sets `status='errored'`. Uses `supabaseAdmin`.
- Webhook URL to register in Mux: `https://project--144ee3b9-80e0-4ec8-883d-e0d5686cb4a1.lovable.app/api/public/mux-webhook`.

### 2. Create flow (`/create`)
- Guarded: not signed in → `/login`; signed in but not creator → "Become a creator" CTA → `becomeCreator()`.
- Step 1: pick file → `createDirectUpload()` → PUT to Mux with XHR progress bar.
- Step 2: details form (title, description, destination, country, city, activity tag chips, budget tag) → `finalizeVideoMetadata()` → redirect to `/profile` with "processing" toast.

### 3. Feed interactions (`/`)
Wire the right-rail buttons currently visual-only:
- Like / Save toggles with optimistic React Query updates.
- "Add to collection" sheet (list + inline new-collection).
- Share via `navigator.share` with copy-link fallback.
- Unauthenticated taps open a "Sign in to continue" sheet linking to `/login`.

### 4. Collections (`/collections`, `/collections/$id`)
- `/collections` grid of own collections + FAB to create.
- `/collections/$id` header (title, visibility, edit, delete) + 3-col thumbnail grid; tap → feed at that video; long-press → remove.
- Server fns: list/get/create/update/delete + `removeFromCollection`.

### 5. Profile (`/profile`, `/u/$username`)
- `/profile` (own): avatar, display name, bio, role badges, edit sheet, tabs (My videos / Collections / Liked), sign-out, "Become a creator" CTA.
- `/u/$username` (public): same minus edit/liked, plus Follow/Unfollow + follower/following counts.
- Avatar upload via existing `avatars` bucket.

### 6. Search (`/search`)
- Sticky search bar + filter sheet (country, activity, budget, sort).
- Tabs: Videos / Creators / Collections.
- Extends existing `searchAll` with filters + cursor + collections. 250ms debounce.

### 7. Auth polish
- `_authenticated.tsx` pathless layout wrapping `/create`, `/collections`, `/profile` — redirects to `/login` if no session (avoids SSR-fetching protected data).

### DB migration
- Add `mux_upload_id` index on `videos` (column already exists).

### What I need from you
1. Approve this plan.
2. Provide the three Mux secrets when the secure form appears (Token ID, Token Secret, Webhook Signing Secret).

### Out of scope (Phase 2+)
AI tagging/transcription, in-app editor, deals/Stripe, business portal, admin dashboard, map view, destination pages, PWA install.
