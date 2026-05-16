## Where we are

Phase 1 (auth, upload, feed, social, search, SEO) and Phase 2 (AI auto-tagging, destinations) shipped. Phase 3 infrastructure (deals schema, business portal, public deals surface) shipped but **not yet smoke-tested end-to-end**. Caption UI on `VideoCard` is still deferred.

## Next steps (in order)

### 1. Smoke test Phase 3 end-to-end (do this first)
Validate the business + deals flow before stacking more features on top.
- Sign in → `/business/apply` → confirm `business` role granted, redirect to `/business`.
- Create a deal via `/business/deals/new` with `country=Indonesia`, `city=Canggu` to match existing test video.
- Verify it appears on `/deals`, `/deals/$id`, and the "Deals" strip on `/destinations/Indonesia`.
- Click the CTA on `/deals/$id` → confirm `deal_clicks` row inserted and `deals.click_count` incremented by the trigger.
- Edit + delete from `/business/deals/$id/edit`.
- Fix anything that breaks (most likely candidates: RLS on `listMyDeals`, role refresh after apply, deal strip filter casing).

### 2. Mux player swap + caption toggle (close Phase 2)
- Add `@mux/mux-player-react` and replace the raw `<video>` in `src/components/feed/VideoCard.tsx`.
- Wire native CC controls; default off, surface when `videos.captions_ready=true`.
- Keep autoplay/mute behavior and creator overlay intact.

### 3. Click analytics dashboard for businesses
- New server fn `getDealStats(dealId, range: '7d'|'30d')` aggregating `deal_clicks` by day.
- Add a small sparkline + 7d/30d totals to each row on `/business`.
- Per-deal detail page `/business/deals/$id` with the time series + top referrer videos.

### 4. Video → Deal attribution CTA
- On `VideoCard`, when video has `country`+`city` matching an active deal, show a "View deal" pill.
- Tap calls `logDealClick({ dealId, referrerVideoId })` then opens deal URL — gives businesses attribution back to the creator's video.

### 5. Transcript-driven re-tagging (optional polish)
- When `captions_ready` flips true, re-run `inferVideoTagsFromText` with the transcript appended for higher city/activity precision.

## Suggested split

Ship **step 1** as its own turn (test + fixes only — small surface area, high risk if skipped). Then step 2 as its own turn. Steps 3–5 can be one larger turn or split per appetite.

## Technical notes

- All new server fns continue using `requireSupabaseAuth`; no edge functions.
- For step 3, use a SQL `date_trunc('day', clicked_at)` group-by inside a SECURITY DEFINER function or rely on RLS (`deal_clicks owner read` already covers it).
- For step 4, prefer a single `listDealsForLocations(pairs)` server fn batched per feed page to avoid N+1 queries.

## Recommendation

Start with **step 1 (smoke test)** so we know the Phase 3 foundation actually works before layering on the player swap and analytics.
