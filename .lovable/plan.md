# Update `/invest` to reflect the global financial model + v9 TAM/SOM

The Market and Global Expansion sections already wire to `compute.ts` (Global TAM/SAM, UK Base vs Global Viral Y5). A handful of hard-coded strings around them still reference the old UK-only narrative (£343B, £444M Y5 GBV, "v8 market model") and the new v9 TAM/SOM workbook isn't downloadable yet. This pass tightens those.

## Scope (frontend copy + download links only)

**File: `src/routes/invest.tsx`**

1. **Top nav (lines ~95–112)** — add a third download pill next to "Model v2":
   - `Market v9` → `/decks/Travidz_Market_Research_TAM_SOM_v9_Global.xlsx`

2. **Hero (lines ~137–167)**
   - Rewrite the sub-headline. Old: "£343B flows through OTAs that pay creators £0…". New: lead with the global figure — "£675B of global leisure-travel bookings flow through OTAs that pay creators £0 and own the customer. Travidz is the shoppable travel feed…"
   - Update the three hero stat cards from `{ Global TAM £675B, Y5 GBV £444M, Take 4.65% }` to numbers that match the v2 model:
     - Global TAM `£675B`
     - Y5 GBV `£350M → £1.32B` (UK Base → Global Viral)
     - Take `4.65%`

3. **Problem card (lines ~287–297)** — replace "£343B transacted" with "£675B transacted globally" so Problem and Hero tell the same story.

4. **Global Expansion section (lines ~462–554)** — add a second download pill below the "Financial model v2 (Global)" button:
   - `Market research v9 (Global)` → `/decks/Travidz_Market_Research_TAM_SOM_v9_Global.xlsx`
   - Tweak the footnote from "Illustrative scenario layered on the v6 model" → "Illustrative scenario layered on the v2 global model, reconciled to the v9 TAM/SOM workbook."

5. **Footer CTA (line ~703)** — change `v8 market model` → `v9 market model`.

## Out of scope

- No changes to `compute.ts`, `assumptions.ts`, or any data layer.
- No PDF/PPTX regeneration. Deck pills (`PDF`, `PPTX`) keep pointing at Elevator Pitch v3.
- No new sections, no layout restructure.

## Verification

- `rg "£343B|£444M|v8 market" src/routes/invest.tsx` returns zero hits.
- Visit `/invest`, confirm: hero copy reads £675B / £350M → £1.32B; nav has three model download pills; Global Expansion section exposes the v9 workbook; footer reads "v9 market model".
- All four download links return 200 (files already exist under `public/decks/`).
