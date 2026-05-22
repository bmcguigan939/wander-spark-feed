## Plan

1. **Stop showing fake images in Search**
   - Remove/clear the manually added Unsplash thumbnail URLs from the two Instagram-imported videos.
   - Update the Search grid so imported videos without a real thumbnail render a branded platform tile instead of a photo-like placeholder.

2. **Make imported videos show in the feed**
   - Keep imported Instagram rows visible in the feed query (`ready`, not draft, not hidden).
   - Update the feed card behavior for imported videos with no hosted playback: show a clear Instagram/external-video card with the video title and a play/open action that links to the original Instagram reel.
   - This avoids blank cards while making it obvious the video is external until it is uploaded/hosted on Travidz.

3. **Repair the two affected database rows**
   - Clear the fake thumbnail URLs for:
     - `a70e55df-35d2-4f3d-abd7-36ba4e0aa9a7`
     - `655ee8ca-f508-4953-842f-0c61caf1b418`
   - Leave their `status`, `source_url`, `source_platform`, and `embed_mode` intact so they remain live as imported link cards.

4. **Technical notes**
   - I won’t auto-download/rehost private or restricted Instagram reels because the app currently has no authenticated rights-based Instagram media pipeline; the safe immediate fix is to render them as external imported videos, not fake hosted videos.
   - Search/feed will distinguish hosted Travidz videos (`mux_playback_id`) from imported external videos (`embed_mode='link_card'`, `source_url`).

5. **Verification**
   - Confirm the feed returns visible rows including the two Instagram imports.
   - Confirm Search no longer displays the Unsplash/fake thumbnails for those imports.
   - Confirm the imported feed cards are not blank and open the original Instagram source.