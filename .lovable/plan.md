## Goal
The Shepherd Hut video has no `video_deals` row, so `listVideoDeals` returns empty and no deal card renders. Layout fixes (bottom overlay above BottomNav, taller scrim) were already applied. This plan finishes the remaining data linkage.

## Steps

1. Look up IDs
   - `videos` row for the Shepherd Hut clip
   - `deals` row for BBM Best Stays
   - `business_invites` row matching that creator + video (if any)

2. Insert data (no schema changes)
   - `deal_applications`: one row with `creator_id` = video owner, `business_id` = deal owner, `deal_id`, `status = 'approved'`, `commission_pct` from invite (default 8), `creator_share_pct`/`platform_share_pct` (4/4 default)
   - `video_deals`: link `video_id` ↔ `deal_id`
   - `business_invites` (only if a matching pending invite exists): set `status = 'accepted'`, `accepted_business_id`, `accepted_deal_id`

3. Verify
   - Re-query `listVideoDeals(videoId)` shape (deal joined via approved application + video_deals)
   - Confirm the feed card renders with the existing VideoCard layout fixes

## Notes
- No code changes — `VideoCard.tsx` was already updated in the prior turn.
- No migrations — pure data inserts/updates via the insert tool.
- Future invite acceptances should auto-create these rows; that flow is separate and not part of this plan.
