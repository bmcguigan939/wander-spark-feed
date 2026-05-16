# Next build phases

Phase 1 (DB/auth/upload/feed/social/search/SEO) and most of Phase 2 (AI auto-tagging, destination browsing) are shipped and smoke-tested. Two tracks remain.

## Phase 2 polish — finish the discovery layer

1. **Global nav entry for Destinations**
   - Add a "Destinations" link to the top nav next to Search so the new `/destinations` tree is reachable without typing the URL.
   - Active state via `activeProps`.

2. **Mux auto-captions + caption toggle**
   - Enable Mux auto-generated English captions on asset creation (set `generated_subtitles` on the input in `getMuxUpload`).
   - Store `captions_ready: boolean` on `videos` (migration) and flip it on `video.asset.track.ready` webhook events for `text` tracks.
   - Add a CC toggle button on `VideoCard` that, when on, renders a `<track kind="subtitles">` pointing at `https://stream.mux.com/{playbackId}/text/{trackId}.vtt` or uses the Mux player's built-in captions if we switch to `@mux/mux-player-react`.

3. **Transcript-driven tagging upgrade (optional, gated on #2)**
   - When captions become ready, re-run the AI tag pass with the transcript text appended to title+description for higher accuracy on city/activity tags.

## Phase 3 — Deals + Business portal

1. **Schema (`supabase--migration`)**
   - `deals` table: `business_id` (fk profiles), `title`, `description`, `destination`, `country`, `city`, `discount_label`, `price_cents`, `currency`, `url`, `image_url`, `starts_at`, `ends_at`, `is_active`.
   - `deal_clicks` table: `deal_id`, `user_id` (nullable), `clicked_at`, `referrer_video_id` (nullable) — for attribution from a video CTA.
   - Add `business` value to `app_role` enum.
   - RLS: deals are publicly readable when `is_active` and within date window; only the owning business (or admin) can insert/update/delete; clicks are insert-only for anyone, readable only by the deal's business.

2. **Server functions (`src/lib/deals.functions.ts`)**
   - `listDeals({ country?, city?, destination? })` — public.
   - `getDeal(id)` — public.
   - `createDeal`, `updateDeal`, `deleteDeal` — `requireSupabaseAuth`, verify caller has `business` role and owns the row.
   - `logDealClick({ dealId, referrerVideoId? })` — public, rate-limited by IP+dealId per minute.
   - `listMyDeals` and `getDealStats(dealId)` for the portal.

3. **Public surfaces**
   - Surface a "Deals nearby" strip on `/destinations/$country` and `/destinations/$country/$city`.
   - Optional CTA on `VideoCard`: when the video has a matched `destination`+`city` and there is an active deal, show a "View deal" button that calls `logDealClick` then opens the deal URL.

4. **Business portal (`/business`)**
   - Pathless layout `src/routes/_business.tsx` that calls `requireSupabaseAuth` and checks the `business` role; redirects others to `/business/apply`.
   - `/business` dashboard: list my deals + click counts (last 7/30 days).
   - `/business/deals/new` and `/business/deals/$id/edit` forms.
   - `/business/apply` self-serve: writes a `user_roles` row with `business` (or a `business_applications` table if we want admin approval — default: instant grant for now, can add review later).

5. **SEO + nav**
   - Add `/deals` index route listing active deals, plus per-deal pages with proper `head()` meta and JSON-LD `Offer`.
   - Nav entry for "Deals" (public) and "Business" (only when role present).

## Technical notes

- All new server fns use `requireSupabaseAuth` middleware; admin client only inside the Mux/Stripe-style webhooks if any.
- No edge functions — stay on `createServerFn` + `src/routes/api/public/*`.
- Reuse existing destination chip + AI tag normalization so Deals filter cleanly on the same `country`/`city` casing.
- Keep deal images in the existing Supabase storage bucket pattern; add a `deal-images` bucket with public read.

## Suggested order

A. Phase 2 polish (nav + captions) — ~small, unblocks discovery UX.
B. Phase 3 schema + public deals surface.
C. Business portal + apply flow.
D. Click analytics dashboard.

## Status (this turn)

- ✅ Destinations tab added to BottomNav (Map icon).
- ✅ Mux auto-captions enabled on uploads; webhook flips `videos.captions_ready` on `video.asset.track.ready`.
- ⏭️ Caption UI toggle on `VideoCard` deferred — needs a switch to `@mux/mux-player-react` for native CC controls. Track ID flows are wired data-side.
- ✅ Phase 3 schema shipped: `deals`, `deal_clicks`, `business` role, click-count trigger, `deal-images` storage bucket + RLS.
- ✅ Deals server fns (`src/lib/deals.functions.ts`): list/get/create/update/delete/listMine/logClick/applyForBusiness/getMyRoles.
- ✅ Public surfaces: `/deals` index, `/deals/$id` detail (logs a click on CTA).
- ✅ Business portal: `/business` dashboard, `/business/apply` self-serve role grant, `/business/deals/new`, `/business/deals/$id/edit`.
- ✅ Deal strip on `/destinations/$country`.
- ✅ Profile page link to Business portal / apply.

## Next up

- Mux player swap for native CC + per-track URL.
- Click analytics dashboard (last 7/30 days time series in `/business`).
- Smoke test: apply as business → create a deal → verify it appears on `/deals` and on a matching destination page → CTA click increments counter.
