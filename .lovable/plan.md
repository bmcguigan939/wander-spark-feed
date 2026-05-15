## Travidz — Phase 1 MVP

A mobile-first responsive web app (TanStack Start + Lovable Cloud) that opens directly into a TikTok-style vertical travel video feed. This plan covers **Phase 1 only** — the core social loop. AI, Creator Studio, deals, and payments are out of scope and will be planned separately after Phase 1 ships.

### What we're building

**Five-tab mobile-first shell** (bottom nav): Feed · Search · Create · Collections · Profile. App opens on Feed (no landing page).

**1. Vertical video feed** (`/`)
- Full-screen, snap-scroll vertical pager (one video per viewport)
- Autoplay current video, pause others, tap to mute/unmute
- Right-rail action stack: like, save, add-to-collection, share, follow
- Bottom overlay: creator avatar + handle, destination, location pin, activity tags, budget tag, caption
- Mux Player for HLS playback
- Personalized ordering (Phase 1: simple — follows first, then trending by like/save/watch counts; AI re-ranking deferred to Phase 2)

**2. Auth & roles** (`/login`, `/signup`)
- Email/password + Google via Lovable Cloud
- `profiles` table auto-created via trigger
- Separate `user_roles` table (enum: `traveller`, `creator`, `business`, `admin`) — never on profiles
- Default role on signup: `traveller`; "Become a creator" flow upgrades role

**3. Search** (`/search`)
- Single search bar + filter sheet (destination, country, activity, budget, travel style, season)
- Tabs for results: Videos · Creators · Destinations · Collections
- Phase 1: Postgres full-text search across `videos.title/description/tags` and `profiles.username/bio`. Vector/AI search deferred to Phase 2.

**4. Create / Upload** (`/create`, creator role only)
- Pick video file → upload to Mux via signed Direct Upload URL (server fn)
- Form: title, description, destination, country, city, activity tags, budget tag
- Poll Mux webhook → set `videos.status = ready` + store playback ID + thumbnail
- No in-app editing in Phase 1 (Creator Studio = separate phase)

**5. Collections** (`/collections`, `/collections/$id`)
- Create folder (title, description, public/private)
- Add/remove videos via "+" action on any feed card
- Grid view of saved videos inside a folder

**6. Profile** (`/profile`, `/u/$username`)
- Own profile: avatar, bio, edit, role badge, my videos, my collections, followers/following counts
- Public creator profile: same minus edit, plus Follow button and video grid

**7. Seed content**
- You'll supply ~20–30 stock travel clips + cover images
- I'll seed creators + videos via SQL so the feed feels alive on first open

### Data model (Lovable Cloud / Postgres)

```text
profiles(id PK→auth.users, username UNIQUE, display_name, bio, avatar_url, created_at)
user_roles(id, user_id→auth.users, role app_role, UNIQUE(user_id,role))
videos(id, creator_id→profiles, title, description, mux_asset_id, mux_playback_id,
       thumbnail_url, duration_sec, destination, country, city, activity_tags text[],
       budget_tag, status, like_count, save_count, view_count, created_at)
follows(follower_id, creator_id, PK(follower_id,creator_id))
likes(user_id, video_id, PK(user_id,video_id))
saves(user_id, video_id, PK(user_id,video_id))         -- quick-save (separate from collections)
video_views(id, user_id NULL, video_id, watch_ms, created_at)  -- for trending sort
collections(id, owner_id→profiles, title, description, visibility, cover_video_id, created_at)
collection_items(collection_id, video_id, added_at, PK(collection_id,video_id))
```

RLS on every table. Counters (`like_count`, `save_count`, `view_count`) maintained by triggers. `has_role(uid, role)` SECURITY DEFINER helper for policies.

### Mux integration

- Server fns (`src/lib/mux.functions.ts`) — never call Mux from the client:
  - `createDirectUpload()` → returns signed upload URL + upload ID
  - `getAsset(assetId)` → polled by creator after upload
- Public webhook route `src/routes/api/public/mux-webhook.ts` — verifies Mux signature, updates `videos.status`, `mux_playback_id`, `thumbnail_url`, `duration_sec`
- Secrets needed: `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET`
- Client uses `@mux/mux-player-react` for HLS playback

### Design direction

Dark-mode-first, cinematic, mobile-led. Full-bleed video, floating glass action stack (subtle backdrop-blur), generous gradient scrim at top/bottom for legibility, restrained micro-motion (spring on like, snap-scroll feel). Tokens defined in `src/styles.css` as oklch. I'll propose a palette + type pair when we start building — no separate design-direction prototype round needed for a video-first UI where composition is fully constrained.

### Out of scope (Phase 2+)

AI transcription/tagging/summaries, AI search, AI itinerary builder, in-app video editor, music library, business portal, deals, discount codes, Stripe Connect splits, creator storefronts, map view, destination auto-pages, admin dashboard, native mobile app, PWA install.

### Technical notes

- **Stack**: TanStack Start (this template), Lovable Cloud (Supabase under the hood), Mux for video, Tailwind v4 tokens
- **Routes** under `src/routes/`: `index.tsx` (feed), `search.tsx`, `create.tsx`, `collections.tsx`, `collections.$id.tsx`, `profile.tsx`, `u.$username.tsx`, `login.tsx`, `signup.tsx`, `_authenticated.tsx` (guard for create/collections/profile)
- **Server fns** in `src/lib/*.functions.ts`; `requireSupabaseAuth` middleware for user-scoped ops
- **What I need from you before building**:
  1. Confirm enabling **Lovable Cloud** (required for auth + DB + storage)
  2. Your **Mux account** API token ID + secret + webhook signing secret (I'll request via secrets tool when we start)
  3. A **zip or drive link** of ~20–30 sample vertical travel clips (≤60s each) with rough metadata (destination, creator handle to assign)

Ready to build once you approve.
