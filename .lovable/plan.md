## Goal
Rebuild `public/decks/Travidz_Elevator_Pitch_v5.pptx` so it stays in lockstep with the freshly-rebuilt v5 PDF.

## Findings
`scripts/build_elevator_pitch_v5_pptx.mjs` already encodes the correct content:
- CTA pill: `▶  Live pitch · wander-spark-feed.lovable.app/invest` (matches v4/PDF)
- TAM `£87.6B / £675B`, SAM `£23.2B / £175B`, Y5 SOM `£350M → £1.32B`, Ask `£2.5M SAFE`
- Same Problem / Traction / Team / Solution / Business Model / Growth Plan copy as the PDF script

So no source edits are needed — the PPTX on disk is just stale relative to the latest script. We only need to re-run the builder and copy the artifact into `public/decks/`.

## Steps
1. Ensure `/tmp/elevator_hero.jpg` exists (re-copy from `public/` hero asset if missing).
2. Run `node scripts/build_elevator_pitch_v5_pptx.mjs` to emit `/mnt/documents/Travidz_Elevator_Pitch_v5.pptx`.
3. Copy the output to `public/decks/Travidz_Elevator_Pitch_v5.pptx` (overwrite).

## Verification
- `python -m markitdown public/decks/Travidz_Elevator_Pitch_v5.pptx` → confirm `Live pitch`, `£675B`, `£350M → £1.32B`, `£23.2B / £175B` all present and no `£343B|£444M|£82.9B|£20.7M` hits.
- Convert to PDF via `soffice --headless --convert-to pdf` and `pdftoppm` → visually diff slide-01.jpg against the v5 PDF: CTA pill text, market strip numbers, and card copy match.
- Fix any rendering issues found (e.g. CTA overflow, text clipping) before declaring done.

## Out of scope
- No copy or number changes.
- No edits to PDF script, `/invest` route, or routeTree.
