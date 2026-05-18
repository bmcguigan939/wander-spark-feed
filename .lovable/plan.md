# Align elevator pitch v5 with v4's exact styling

The attached v4 PDF and our shipped v5 use the same one-page layout, palette, and card structure. Diffing the renders, only one visual difference is meaningful:

- **CTA pill label**: v4 reads `▶ Live pitch · wander-spark-feed.lovable.app/invest`. Our v5 PDF reads `▶ Try the live pitch · …` (the PPTX already matches v4).

Everything else — phone mockup, top bar, side cards, TAM/SAM/SOM strip, ask allocation bar, footer chips — already matches.

## Scope

**File: `scripts/build_elevator_pitch_v5.py`**
- Change `cta_label = "▶  Try the live pitch  ·  " + LIVE_LABEL` → `cta_label = "▶  Live pitch  ·  " + LIVE_LABEL`.

Then rebuild and copy:
1. `python scripts/build_elevator_pitch_v5.py`
2. `cp /mnt/documents/Travidz_Elevator_Pitch_v5.pdf public/decks/`

## Verification

- `pdftoppm` the new v5 PDF, visually confirm the CTA label now reads "Live pitch" with no overflow inside the pill.
- Keep all global numbers as-is (£675B TAM, £175B SAM, £350M → £1.32B Y5 SOM). Re-grep for `£343B|£444M|£82.9B|£20.7M` in the rebuilt PDF to confirm zero hits.

## Out of scope

- PPTX is already aligned; no change needed.
- No copy or numbers changes — only the CTA pill label.
- `/invest` links already point at v5; no route changes.
