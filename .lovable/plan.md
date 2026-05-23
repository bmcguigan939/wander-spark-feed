## Goal

Enforce **per-video deal contracts**: a video can only surface deals where that video's creator has an `approved` row in `deal_applications` for the deal. If none exist, the video shows no booking CTA. All booking/commission attribution stays tied to the video the guest booked from.

## Current behaviour (the bug)

- `attachMatchedDeals` in `src/lib/feed.functions.ts` matches any active deal by country/city and pins it to every video in that area — no contract check.
- `listVideoDeals` (`src/lib/video-deals.functions.ts`) returns whatever the creator manually attached via `video_deals`, again with no contract check, so a creator could attach a deal they never had approved.
- `VideoCard` shows the `matchedDeal` ribbon + the `video-deals` list without filtering.

Result: guests on Creator A's video see deals that pay Creator A even though A has no contract with that business — and could see deals belonging to Creator B's contracts.

## Changes

### 1. Server: contract-gated deal resolution

**`src/lib/video-deals.functions.ts` — `listVideoDeals`**
- Look up the video's `creator_id`.
- Inner-join (or two-step filter) `video_deals → deals` against `deal_applications` where `creator_id = video.creator_id AND deal_id = video_deals.deal_id AND status = 'approved'`.
- Return only deals that pass the contract check.

**`src/lib/video-deals.functions.ts` — `attachDealToVideo` / `attachDealsBulk`**
- Before upserting into `video_deals`, verify each `deal_id` has an `approved` row in `deal_applications` for `context.userId`. Reject with a clear error otherwise. Prevents creators attaching deals they don't have a contract for.

**`src/lib/feed.functions.ts` — `attachMatchedDeals`**
- Replace the geo-only match with a query that, for each video, picks the best deal among `deal_applications` rows where `creator_id = video.creator_id AND status = 'approved'`, preferring same-city → same-country.
- If a video's creator has no approved contracts in that area, leave `matchedDeal` undefined (no CTA shown — matches the "Hide deals entirely" rule the user chose).

### 2. Client: stop showing un-contracted CTAs

**`src/components/feed/VideoCard.tsx`**
- No structural changes — once the server returns no `matchedDeal` and an empty `attachedDeals`, the existing conditional rendering will already hide the deal pill / book CTA.
- Confirm `logDealImpression` / `logDealClick` only fire when `matchedDeal` exists (already the case).

### 3. Attribution stays video-scoped (already correct, just verify)

- `bookings.creator_id` and `deal_redemptions.creator_id` are derived from `referrer_video_id → videos.creator_id` at checkout time. Confirm the checkout/redeem server fns set `creator_id` from the *video the click came from*, not from any session-level "first referrer". If they currently fall back to a session referrer, remove that fallback so Creator B always gets credit for a booking made from B's video — even if the guest entered via A's share link.

### 4. No schema migration required

`deal_applications` already has `(creator_id, deal_id, status)`. We're just enforcing it at read/write time.

## Out of scope

- No cross-creator "Related in this area" rail (explicitly rejected).
- No referrer-credit split between Creator A and Creator B.
- No changes to how deals are discovered or to the deal_applications approval flow itself.
- No fallback to generic Travidz deals on uncontracted videos.

## Files touched

- `src/lib/video-deals.functions.ts` — contract filter in `listVideoDeals`, contract guard in attach mutations.
- `src/lib/feed.functions.ts` — rewrite `attachMatchedDeals` to filter through `deal_applications`.
- Checkout/redeem server fn (likely `src/lib/bookings.functions.ts` or similar — I'll locate during build) — verify `creator_id` is always derived from `referrer_video_id`.