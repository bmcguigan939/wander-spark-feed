# Post-trip reviews → creator & business quality scores

A frictionless review fires after a booking's travel/stay date, and feeds two separate aggregate scores:
1. **Creator quality score** — boosts/suppresses their videos in the feed.
2. **Business rating** — a public, global star rating shown on every deal & business page (the "honest view of the product" customers can trust).

Both pull from the **same review row** — one tap from the traveller updates both.

## How it works (user-facing)

1. Booking completes (travel_date passed for activities; checkout for stays).
2. Traveller gets a push + email + in-app prompt: **"How was [Deal] with [Business]?"**
3. **The 2-second review** — one row of 5 stars. That's it; tapping a star submits.
4. Optional follow-up screen: 3 tap-chips ("As shown in the video", "Great host", "Would book again"), free-text comment, photos. All skippable.
5. The single review attaches to:
   - **Business** → updates the global business rating customers see.
   - **Deal** → per-deal star rating on the deal card.
   - **Creator** (only if booked via their video) → updates their quality score.

## What gets built

### 1. Data model (one new table)

New table `booking_reviews`:
- `booking_id` (unique — one review per booking), `deal_id`, `business_id`, `user_id`
- `creator_id`, `referrer_video_id` (frozen at insert from `bookings`)
- `rating` (1–5), `matched_video` (bool), `tags` (text[]), `comment` (text, nullable), `photos` (text[])
- `status` ('published' | 'hidden' | 'flagged'), `created_at`, `updated_at`
- RLS: traveller can insert/update within 72h of completion; everyone can read `published`; business + creator can read their own; admins can moderate.

Additions:
- `bookings`: `completed_at`, `review_prompt_sent_at`, `review_token` (unguessable, lets the email/push deep-link auto-auth into the review screen).
- `profiles` (used for both businesses & creators):
  - **Business side:** `business_rating_avg`, `business_rating_count`, `business_rating_refreshed_at`.
  - **Creator side:** `creator_rating_avg`, `creator_rating_count`, `creator_quality_score`, `creator_quality_refreshed_at`.
- `deals`: `deal_rating_avg`, `deal_rating_count` (per-product score so customers can compare individual experiences inside a multi-deal business).

### 2. Server functions (`src/lib/reviews.functions.ts`)

- `getPendingReview({ bookingId })` — auth-gated to the traveller, returns booking + deal + business + creator info for the screen.
- `submitReview({ bookingId, rating, matchedVideo?, tags?, comment?, photos? })` — Zod-validated, idempotent on `booking_id`, writes the row, triggers recompute.
- `getReviewsForDeal({ dealId, limit, cursor })` — public, paginated, `published` only.
- `getReviewsForBusiness({ businessId, limit, cursor })` — public, paginated.
- `getReviewsForCreator({ creatorId, limit, cursor })` — public, paginated, names redacted.
- `flagReview({ reviewId, reason })` — anyone can flag; sets `status='flagged'`, goes to admin queue.

### 3. Aggregation (DB triggers, instant updates)

Trigger on `booking_reviews` insert/update/delete:
- Recompute `deals.deal_rating_avg` + `deal_rating_count` for that deal.
- Recompute `profiles.business_rating_avg` + `business_rating_count` for that business (averaged across **all** of that business's deals — that's the global rating customers see).
- Bump `profiles.creator_rating_avg` + `creator_rating_count` for the creator (if any).

These are cheap aggregates and need to be live (so the "honest view of the product" is always current). Trigger-based — not nightly cron.

### 4. Creator quality score (nightly cron)

`refresh_creator_quality()` DB function — for each creator with ≥3 reviews in the last 12 months:
- `avg_rating` = mean rating
- `match_rate` = share of `matched_video = true` (did the trip live up to the video?)
- `volume_factor` = log-scaled review count
- `recency_decay` = weight last 90 days higher
- `quality_score` = 100 × (0.6·norm(avg_rating) + 0.25·match_rate + 0.15·volume_factor) × recency_decay
- Cold start (<3 reviews): score = null → neutral weight in feed ranking.

Run via `pg_cron` calling `/api/public/cron/refresh-creator-quality`.

> Business rating is a **straight average across all reviews** — no decay, no boosts. The business's reputation is the unmanipulated mean, displayed as e.g. "4.7 ★ (1,284 reviews)". That's the customer-trust number; the creator score is a separate ranking-only signal.

### 5. Feed ranking integration

In `feed.functions.ts` and `match_videos`, multiply the existing rank by a `quality_multiplier` derived from `creator_quality_score`:
- ≥80 → 1.25× (boost)
- 60–79 → 1.0× (neutral)
- 40–59 → 0.75× (soft suppress)
- <40 → 0.4× (hard suppress)
- null (cold start) → 1.0×

Same multiplier gates Power Tier qualification so consistently bad reviews can't unlock top tier.

### 6. UI

**New routes:**
- `/review/$bookingId` — the 2-second review. Big star row, auto-submits on first tap, then shows optional comment/photos screen.
- `/review/$bookingId/thanks` — confirmation + link back to the deal.

**Surfaces:**
- `deals.$id.tsx` — add star summary block ("4.8 ★ · 312 reviews") + most-recent 5 published reviews + "See all" link to a `/deals/$id/reviews` page.
- **Business page** (`u.$username.tsx` when the profile is a business) — big global rating header: "4.7 ★ · 1,284 reviews across 12 experiences", a distribution bar (5★ 78% / 4★ 14% / …), and a paginated review list. This is the "honest view of the product" the user asked for.
- Business search / deal cards (`deals.index.tsx`) — show `★ avg (count)` so customers can scan & compare at a glance.
- `u.$username.tsx` (creator) — show creator's `creator_rating_avg` + count ("4.8 ★ · 132 trips reviewed"). Never display the raw `quality_score` number.
- `profile.tsx` (traveller) — "Trips to review" card with one-tap deep links.
- `book.return.tsx` — set expectation: "We'll ask you for a 2-second review after your trip."
- New email template `review-request-traveller.tsx` with deep-link button using `review_token`.

### 7. Completion + prompt cron

`/api/public/cron/finalize-and-prompt-reviews`:
- Mark bookings `completed` when travel_date has passed.
- Send "How was your trip?" email + push for newly completed bookings.
- Re-nudge once at +3 days if no review submitted.

### 8. Moderation & anti-abuse

- DB unique on `booking_id` (one review per booking).
- Reviews only allowed for bookings in `confirmed`/`completed` with `completed_at IS NOT NULL`.
- Editable for 72h, then locked.
- Anyone can flag → `status='flagged'`, excluded from public + from aggregates until resolved.
- Businesses/creators cannot see *which traveller* left *which rating* (aggregate + anonymized reviewer name only) to prevent retaliation.
- Rate-limit `submitReview` per user.
- Photos go through the existing moderation pipeline.

## Out of scope (this pass)
- Business replies to reviews (can ship as a follow-up).
- Verified-purchase badge (implicit — every review is tied to a real Travidz booking, so we can simply label them all "Verified booking").
- Changing creator-tier formula beyond multiplying by quality_multiplier.

## Open questions before I build
1. **Stay completion:** bookings store only `travel_date` (single date). For multi-night stays, add a `checkout_date` column, or treat `travel_date` as check-in and prompt the morning after for v1?
2. **Activity prompt timing:** same evening, or next morning?
3. **Cold-start creators** (<3 reviews): leave at neutral 1.0× boost, or give a small "new creator" boost (1.1×) for their first 30 days to help them get traction?
