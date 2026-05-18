# Add live pitch link to elevator pitch

Update both v3 artifacts to surface the in-app investor pitch URL: **https://wander-spark-feed.lovable.app/invest**

## Changes

1. **`scripts/build_elevator_pitch_v3.py`** (PDF)
   - Add a call-to-action strip in the footer / under the hero: "Experience the product → wander-spark-feed.lovable.app/invest"
   - Make the URL a clickable link annotation (reportlab `linkURL`).

2. **`scripts/build_elevator_pitch_v3_pptx.mjs`** (PPTX)
   - Add the same CTA line with `hyperlink: { url: ... }` so it's clickable in PowerPoint/Keynote.

3. Regenerate both files to `/mnt/documents/Travidz_Elevator_Pitch_v3.pdf` and `.pptx`, then visual-QA via `pdftoppm`.

No app code changes. No new files.
