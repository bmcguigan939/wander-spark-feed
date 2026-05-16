## Status

- ✅ Step 1 smoke test
- ✅ Step 4 (this turn): "View deal" CTA on feed videos with attributed clicks
- ⏭️ Next: Step 2 Mux Player caption toggle, Step 3 click analytics dashboard

## Last shipped: Deal CTA on feed videos

Surface a tappable "View deal" pill on each `VideoCard` in the feed when the video's location matches an active deal. Tapping logs an attributed click (with the referring video ID) and opens the deal.

### Scope

1. **New server fn** `listDealsForLocations(pairs)` in `src/lib/deals.functions.ts`
   - Input: array of `{ country, city }` pairs from the current feed page.
   - Returns a map keyed by `"country|city"` → top active deal (id, title, discount_label, url, image_url).
   - One batched query (`is_active=true`, public RLS already allows), grouped client-side. Avoids N+1.

2. **Wire into the feed**
   - In `src/lib/feed.functions.ts` (or the feed route loader/query), after fetching videos, call `listDealsForLocations` with the page's `(country, city)` pairs and attach `matchedDeal` onto each video.
   - If matching only by `country` is needed as a fallback when `city` is null, handle it in the same lookup.

3. **`VideoCard.tsx` UI**
   - When `video.matchedDeal` exists, render a compact pill near the bottom-right action stack: tag icon + "View deal" + optional `discount_label`.
   - Style with existing design tokens (semi-transparent dark chip, primary accent for discount).
   - On tap:
     - call `logDealClick({ dealId, referrerVideoId: video.id, userId: user?.id })` (already exists, just pass `referrer_video_id`).
     - open `/deals/$id` via `<Link>` (in-app) rather than the external URL — keeps users in the feed and lets the deal detail page handle the outbound click.

4. **Verify**
   - Seeded Canggu/Indonesia deal shows the pill on the matching video in the feed.
   - Tap inserts a `deal_clicks` row with `referrer_video_id` populated and increments `deals.click_count`.
   - Videos with no matching deal render unchanged.

### Out of scope

- Multiple deals per location (show only the most recent for now).
- Per-deal analytics dashboard (still Step 3 on the roadmap).
- Mux Player swap (still Step 2 — can come after).

### Technical notes

- `deal_clicks.referrer_video_id` column already exists; `logDealClick` already accepts it — no schema change.
- Public `deals` SELECT RLS already filters to active + within date window, so the batched query is safe with the anon client.
- Matching key normalization: lowercase + trim both sides to avoid casing drift between `videos.country/city` and `deals.country/city`.
