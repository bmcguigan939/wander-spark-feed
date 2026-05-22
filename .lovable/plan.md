## What’s actually wrong

- The Instagram/Facebook rows exist in the database and are marked live, but they are imported as `link_card` records, not hosted Travidz videos. They have no `mux_playback_id`, so there is no playable Travidz-hosted video file.
- The For You feed ranking heavily favors older seeded/demo rows with high engagement, so the new imported rows can be pushed out of the first 20 results even though they are live.
- Search can render imported rows as generic/blank-looking tiles when there is no real thumbnail, which makes them look missing or broken.
- Instagram/Facebook links cannot reliably be downloaded server-side just because the creator owns them. Meta often blocks automated access, login-gates content, restricts private/close-friends posts, and does not expose a simple public download API for reels/posts. Ownership confirmation helps with permission, but it does not give Travidz technical access to the video bytes.

## Plan to fix it properly

1. **Make imported videos visibly appear in feed**
   - Adjust the For You feed ranking so brand-new creator imports are guaranteed to surface in the initial feed, even with zero likes/views.
   - Keep hidden/draft/scheduled filters intact.
   - Ensure imported `link_card` videos render as intentional external-video cards, not blank player slots.

2. **Make imported videos clearly visible in Search**
   - Ensure Search selects and returns `source_platform`, `source_url`, and `embed_mode` everywhere video results are used.
   - Improve no-thumbnail tiles so Instagram/Facebook imports show a branded platform tile with the title and “Open on Instagram/Facebook” treatment instead of fake photos or empty boxes.
   - Fix the budget tag mismatch so imported rows using `budget/mid/luxury` are not excluded by filters expecting `$ / $$ / $$$`.

3. **Fix misleading import copy**
   - Change the import UI copy from “embed/play without leaving Travidz” to the accurate behavior: imported social videos are linked cards unless the creator uploads the actual file.
   - Make the choice clear: **Link social post** for discovery, or **Upload video file** to host/play natively on Travidz.

4. **Add a safe path for real Travidz-hosted video**
   - Keep “Upload” as the reliable way to host the creator’s own video on Travidz.
   - Do not attempt automatic Instagram/Facebook scraping/downloading; it will keep failing for restricted posts and can violate platform rules.

5. **Repair current imported rows**
   - Keep the two Instagram imports live with no fake thumbnails.
   - Verify they appear at the top/near top of Search and inside the first feed batch as external Instagram cards.

## Technical changes

- Update `src/lib/feed.functions.ts` ranking/search filters and budget mapping.
- Update `src/components/feed/VideoCard.tsx` external-card rendering for `link_card` videos.
- Update `src/routes/search.tsx` result tiles for imported videos without thumbnails.
- Update `src/routes/create.tsx` import messaging so creators understand link-card vs hosted upload.