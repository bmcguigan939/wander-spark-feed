## Goal
The screenshot you shared shows the **old** deck still displaying UK-only figures (£343B / £82.9B / £444M / £20.7M). Rebuild both the PDF and PPTX so they show the current **v5 global** numbers and the **freshly recalculated cap-table math** from the £2.5M SAFE model update.

## What changes

**Market strip (replaces old UK-only figures):**
- TAM: `£87.6B / £675B` (UK / Global)
- SAM: `£23.2B / £175B`
- Y5 SOM: `£350M → £1.32B` (UK Base → Global Viral)
- Ask: `£2.5M SAFE`

**Problem card:** "£343B" → "£675B" (global OTA flow)

**Growth plan DEFEND row:** "£444M · ledger + supply lock-in" → "£350M UK Base · Global Viral upside £1.32B"

**New: add a small "Path to breakeven" line** under the Business Model card (or as a 5th bullet), pulling the just-recalculated numbers:
- "EBITDA breakeven M48 · Y1 EBITDA −£1.56M · £2.5M covers peak deficit with £181k cushion"

## Steps
1. Run `python scripts/build_elevator_pitch_v5.py` → emits PDF to `/mnt/documents/`, copy to `public/decks/Travidz_Elevator_Pitch_v5.pdf`.
2. Edit `scripts/build_elevator_pitch_v5_pptx.mjs` so the Business Model card includes the new breakeven bullet, then run it → copy to `public/decks/Travidz_Elevator_Pitch_v5.pptx`.
3. QA both: render PDF and PPTX→PDF to JPEGs at 150 DPI, inspect for the new numbers and confirm no stale `£343B|£82.9B|£444M|£20.7M` remain.

## Out of scope
- No layout/typography redesign — same v5 visual template.
- No changes to `/invest` route, financial model workbook, or hero image.

## Question before I build
Want the **breakeven bullet** added (recommended — it's the strongest line from the updated model), or keep the deck identical to v5 and just refresh the stale numbers in the screenshot?