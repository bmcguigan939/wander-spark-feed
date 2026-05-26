## Add ratings to feed booking tiles + wire creator quality into ranking

Two small follow-ups to finish the review rollout.

### 1. Ratings on every booking link in the feed

Add `deal_rating_avg` and `deal_rating_count` to the two data paths that drive the booking tiles:

- `src/lib/feed.functions.ts` — extend the `matchedDeal` projection to include the two rating columns.
- `src/lib/video-deals.functions.ts` — `listVideoDeals` select adds the same two columns (plus the business's `business_rating_avg` for the host chip).

Then update `src/components/feed/VideoCard.tsx`:

- Under the `matchedDeal` tile (the "Deal nearby" link, line ~431), add a compact star + count line under the title — e.g. `★ 4.8 (1,204)`. Hidden when `deal_rating_count = 0`.
- Same compact star line under each entry in the `attachedDeals` "Book this trip" list (line ~474).
- Style: white-on-dark to fit the existing video-overlay theme, using the existing `RatingSummary` component with a `size="sm"` variant tweaked for dark backgrounds, or an inline span if `RatingSummary` doesn't read well over video.

### 2. Apply `creator_quality_score` to feed ranking

Already computed, not yet used. In `src/lib/feed.functions.ts` (the main feed query), after the existing ordering pass, multiply each video's rank score by a `quality_multiplier` derived from the video's creator:

```text
≥80  → 1.25×
60–79 → 1.00×
40–59 → 0.75×
<40   → 0.40×
null  → 1.00× (cold start: no penalty)
```

Implementation: pull `creator_quality_score` from the joined creator profile, compute the multiplier in JS after the SQL fetch, re-sort. Keep this purely in the ranking layer — don't change recall.

### Out of scope

- Multi-night / activity completion timing rules (still uses `travel_date < today`).
- Business reply-to-review.
- Verified-purchase badge wording change.
- Admin moderation dashboard for `review_flags` (auto-hide at 3 flags is already live).

### Files touched

- `src/lib/feed.functions.ts`
- `src/lib/video-deals.functions.ts`
- `src/components/feed/VideoCard.tsx`
- (Optional) `src/components/reviews/RatingSummary.tsx` — add a `tone="dark"` prop for video overlays.
