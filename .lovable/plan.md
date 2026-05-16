# Travidz brief — what's left to build

Status check against your 25-section brief, based on the current codebase. Three buckets: **Done**, **Partial**, **Not started**.

## Done (shipped and wired)

- **Auth & roles** (Section 2) — sign up / login, role picker on `/welcome`, three roles (Traveller, Creator, Business), role-routed redirects, password reset flow, `user_roles` table with `has_role()`.
- **Bottom nav & shell** (Section 3) — Feed / Search / Create / Collections / Profile, app opens straight into the feed.
- **Vertical video feed** (Section 4) — `VideoCard` with like / save / comment / share / add-to-collection, follow button, destination + tags, Mux playback, view tracking.
- **Search** (Section 5, basic) — `/search` route with text search via Postgres `search_tsv`.
- **Create / upload** (Section 7, basic) — `/create` with Mux direct upload, title/description/tags, destination fields.
- **Collections** (Section 9, basic) — create / view / add-to / public+private visibility, RLS in place.
- **Comments & notifications** (supporting) — comments sheet, notifications route, bell with unread count.
- **Destination pages skeleton** (Section 15) — `/destinations`, `/destinations/$country`, `/destinations/$country/$city`.
- **Business onboarding + deals scaffold** (Sections 11, partial) — `business.apply`, `business.index`, deals CRUD routes, `DealForm`, `deals` + `deal_clicks` + `deal_impressions` tables with RLS.
- **Email infrastructure** (supporting) — `notify.travidz.com` verified, pgmq queue + cron dispatcher live, 6 branded auth email templates scaffolded.
- **Creator storefront entry point** (Section 10, basic) — `/u/$username` profile page.

## Partial (started but not finished)

- **Business deals CRUD** — needs image upload (currently URL field), active/inactive toggle, delete confirm, dashboard empty/loading/error states, public `/deals` polish.
- **Feed personalisation** (Section 4) — feed exists but is chronological; no AI ranking from watch time / likes / saves / follows yet.
- **Search filters** (Section 5) — text search works; no country / activity / budget / season filters.
- **AI video analysis** (Section 6) — Mux webhook + `ai.functions.ts` exist; auto transcript / tagging / summary on upload not wired.
- **Creator studio** (Section 7) — only upload + basic metadata; no in-app trim, captions, overlays, music, or AI title/hook/hashtag generation.

## Not started

- **Music integration** (Section 8) — library, mood/genre search, beat sync.
- **Paid / collaborative folders & folder AI summaries** (Section 9).
- **Creator storefront monetisation** (Section 10) — premium guides, paid itineraries, earnings dashboard.
- **Creator deal application flow** (Section 11) — apply → business approve → unique code + tracking link + QR.
- **Stripe Connect payment split** (Section 12) — business / creator / platform split, payouts, refund tracking.
- **Deal calculator** (Section 13).
- **AI itinerary builder** (Section 14).
- **Destination page enrichment** (Section 15) — AI summary, weather, top creators/hotels, suggested itinerary, deals on page.
- **Map system** (Section 16) — Mapbox/Google Maps view of videos, deals, pins.
- **External booking/affiliate integrations** (Section 17) — Booking.com, GetYourGuide, Viator, Skyscanner, Airalo.
- **Admin dashboard** (Section 18) — no admin routes or moderation tools exist yet.
- **Creator analytics** on `/profile` (views, likes, saves per video).
- **Realtime notifications badge + mark-all-read**.

## Suggested next step (smallest valuable slice)

Finish **Business Deals end-to-end** (Section 11 MVP) so businesses can actually run promotions and you have something to demo:

1. Image upload in `DealForm` → existing `deal-images` bucket.
2. Active/inactive toggle + delete confirm on `business.deals.$id`.
3. Empty/loading/error states on `/business`.
4. Public `/deals` + `/deals/$id` polish; verify `deal_clicks` + `click_count` tracking end-to-end.

Then either:
- **B.** Creator deal application flow (Section 11 cont. → 12) — unlocks the monetisation story.
- **C.** AI video analysis on upload (Section 6) — unlocks search/itinerary/tagging downstream.
- **D.** Creator analytics + realtime notifications — smaller, high polish wins.

Reply with **B**, **C**, **D**, or your own pick and I'll write the implementation plan.
