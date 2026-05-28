## Goal

The live `/invest` page still carries v5/v10-era numbers and wording in several places even though `assumptions.ts` was already moved to v6. Bring the visible page fully into line with the three attached v6 sources (Financial Model v6, Elevator Pitch v6, Market Research TAM/SOM v11).

## Discrepancies found on `/invest` today

| Area | Current (stale) | v6 truth |
|---|---|---|
| Hero meta description / chip | "£2.0M SAFE" | **£2.5M SAFE** |
| Hero stat tile | "Y5 GBV £350M → £1.32B", "Take 4.68%" | **£444M → £1.32B**, **4.65%** |
| StickyBar PDF / PPTX download | v5 deck | **v6 deck** (already in `public/decks/`) |
| StickyBar "Market v10" button | v10 workbook | **v11** workbook (need to copy in) |
| Hero "Download deck" link | v5 PDF | **v6 PDF** |
| BusinessModel calculator | `gbv * 0.0468`, label "4.68%" | **4.65%** (matches pitch) |
| GlobalExpansion compare table | UK GBV £350M / net £16.3M / contribution £15.5M | **£444M / £20.8M / ~£20.0M** (and recomputed multiples) |
| GlobalExpansion download buttons | v10 market workbook | **v11** |
| GrowthPlan "Defend" KPI | "£350M GBV (UK Base)" | **£444M GBV** |
| TheAsk | "£2.0M SAFE", "Series A £8M at £2M ARR (M22)" | **£2.5M SAFE**, "Series A at **£18M ARR run-rate**" |
| ProblemSolution | Implies but doesn't state the strategic line | Add one line: *"OTAs were built for search intent. Travidz is built for creator-led, identity-driven commerce — from day one."* |
| UnitEconomics props | `ukBaseNetY5 = market.somNetBaseY5` (£20.8M) — already correct, but comment in `invest.tsx` still says "£16.3M" | Update stale comment |

## Changes

### 1. `public/decks/Travidz_Market_Research_TAM_SOM_v11_Global.xlsx`

Copy the uploaded v11 workbook into `public/decks/` so the download buttons resolve. Leave v10 in place (don't break any external links already shared).

### 2. `src/routes/invest.tsx` — surgical text/number edits only, no structural changes

- **Meta + Hero**: "£2.0M SAFE" → "£2.5M SAFE" (3 places: `description`, `og:description`, hero chip). Hero stat tile: GBV "£350M → £1.32B" → "£444M → £1.32B", Take "4.68%" → "4.65%".
- **StickyBar**: PDF/PPTX hrefs from `…_v5.…` → `…_v6.…`; Market v10 button → Market v11 button + filename.
- **Hero "Download deck"**: v5 → v6 PDF.
- **ProblemSolution**: append a single sentence to the Problem card body: *"OTAs were built for search intent. Travidz is built for creator-led, identity-driven commerce — from day one."*
- **BusinessModel**: change `0.0468` → `0.0465`, "Blended Y5: 4.68%" → "4.65%", "Travidz net @ 4.68%" → "@ 4.65%".
- **GlobalExpansion `compare` array**: UK GBV "£350M" → "£444M"; UK net "£16.3M" → "£20.8M"; UK contribution "£15.5M" → "£20.0M"; recompute "vs UK" multiples (GBV 1.32B/444M = **3.0x**, net 61.9/20.8 = **3.0x**, contribution 58.9/20.0 = **2.9x**). Update download button to v11 workbook + filename. Update caption "reconciled to the v10 TAM/SOM workbook" → "v11", and "£2.0M SAFE" → "£2.5M SAFE".
- **GrowthPlan**: "£350M GBV (UK Base)" → "£444M GBV (UK Base)".
- **TheAsk**: headline "£2.0M SAFE · 18-month runway" → "£2.5M SAFE · 18-month runway"; subhead "Next: Series A £8M at £2M ARR (M22)" → "Next: Series A at **£18M ARR run-rate**. Target KPIs at next round: 24,000 active creators, £444M annualised GBV, 4.65% blended take." (mirrors pitch + v6 model Y5).
- **Stale comment** on lines 48–50 ("…£16.3M…") updated to reference £20.8M so future readers aren't misled. No logic change — `ukBaseNetY5` already reads from `GLOBAL_MARKET.somNetBaseY5`.

### Out of scope

- No changes to `assumptions.ts`, `compute.ts`, `scenarios.ts`, or `commission.ts` — the v6 numbers are already encoded there.
- No changes to the deck/pitch artifacts themselves; the user has already attached the v6 versions.
- No new routes, components, or schema changes.

## Deliverables

1. `public/decks/Travidz_Market_Research_TAM_SOM_v11_Global.xlsx` copied in from upload.
2. Edited `src/routes/invest.tsx` with the 11 surgical edits above.
3. Visual check of `/invest` to confirm headline stats now read £444M / £1.32B / 4.65% / £2.5M SAFE.
