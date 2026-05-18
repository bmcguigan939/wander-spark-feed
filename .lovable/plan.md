## Goal

Update `Travidz_Market_Research_TAM_SOM_v8-2.xlsx` so the **TAM / SAM / SOM** build reflects the new global v2 financial model (UK + EU-5 + USA + AUS/NZ + LATAM + MENA + Africa + India + SEA + Greater China), and reconciles cleanly to `Travidz_Financial_Model_v2_Global.xlsx`.

Save as **`Travidz_Market_Research_TAM_SOM_v9_Global.xlsx`** in `/mnt/documents/` and copy to `public/decks/` so it's downloadable from the live `/invest` page.

## Source of truth

Use the same regions block already in the v2 financial model (and now mirrored in `src/lib/investor-model/assumptions.ts` as `GLOBAL_REGIONS`):

| Region | Travellers (M) | Blended ABV (£) |
|---|---:|---:|
| UK | 25 | 480 |
| EU-5 | 150 | 460 |
| USA | 180 | 540 |
| AUS / NZ | 18 | 580 |
| LATAM (Brazil-led) | 110 | 280 |
| MENA | 70 | 380 |
| Africa | 90 | 220 |
| India | 140 | 200 |
| SEA | 160 | 240 |
| Greater China | 280 | 420 |
| **Total** | **1,223 M** | — |

Attach rate 1.5 bookings/yr, SAM share 26% (creator-influenced × bookable, global blend). These match the Global Viral column of the financial model.

## Edits per sheet

**1. Cover** — Update geography line to "UK Y1-Y2 · EU-5 Y3 · Global Viral upside Y3-Y5"; bump version banner to v9 and reconcile-to to `Travidz_Financial_Model_v2_Global.xlsx`.

**3. TAM** — Keep the UK and EU-5 blocks intact. Append a new **"Global expansion layer"** block listing the 8 additional regions with `Travellers / Attach / ABV / GBV` columns and a subtotal. Add two new conclusion lines: `TAM (Global)` and `Global commission pool (8%)`. UK and UK+EU-5 totals remain so the existing pitch line stays valid.

**4. SAM** — Append rows for the 8 additional regions in the per-country table (Travellers M, smartphone %, creator-discovery share — using region-specific defaults sourced from GWI / Statista). Add `SAM (Global)` row using 26% blended share × bookable, and a `Global commission pool` line.

**5. SOM** — Add a **4th scenario column "Global Viral"** alongside Bear / Base / Bull with the v2 financial-model anchors:
- Active creators Y1-Y5: 1,500 / 9,000 / 32,000 / 70,000 / 120,000
- GBV per active / yr: £11,020 (back-solved from £1.32B / 120k Y5, blended down across regions)
- Take rate Y5: 4.65% (unchanged)
- Y5 GBV £1.32B, Y5 net £61.6M
Add a `Global Viral` row to the "Scenario comparison — Y5 Travidz net revenue" block.

**2. Exec Summary** — Add a Global TAM column to the headline market-size table (Global ~£675B, SAM ~£175B, commission pool ~£54B). Add a "Y5 Global Viral upside" row to the bottom-up build mirroring sheet 5. Refresh the "Top 5 pitch-ready stats" so two stats reference the global story (`£675B global TAM`, `Y5 Global Viral GBV £1.32B = <1% of global SAM`).

**10. Sensitivity** — Add a second tornado row labelled "Global Viral Y5 net (£62M base)" so investors see both UK Base and Global Viral sensitivity ranges.

**12. Rev-Share Scenarios** — Update the Y5 GBV reference from `£444M` to two columns: UK Base £444M and Global Viral £1,322M, so the rev-share lever can be tested against both worlds.

**13. Reconciliation** — Add a second reconciliation block: "Global Viral vs Travidz_Financial_Model_v2_Global.xlsx" with the same creator / GBV / net / take-rate rows, Y1-Y5 anchors from the v2 workbook, and PASS/REVIEW status formulas.

**11. Sources** — Append `[S26] UNWTO World Tourism Barometer 2024`, `[S27] Statista Asia-Pacific outbound 2024`, `[S28] WTTC Regional EIR 2024` for the new regions.

## QA

- Run `recalculate_formulas.py`; assert zero `#VALUE / #REF / #DIV / #NAME` across all 13 sheets.
- Verify reconciliation sheet ends in PASS for both UK Base and Global Viral.
- Convert to PDF and visually inspect every sheet — confirm the three conclusion numbers match the live `/invest` page: `Global TAM ~£675B`, `Global SAM ~£175B`, `Y5 SOM £350M → £1.32B`.
- Save to `/mnt/documents/Travidz_Market_Research_TAM_SOM_v9_Global.xlsx` and copy to `public/decks/`.

## Out of scope

- No changes to the financial model itself (already correct).
- No changes to the `/invest` page wiring (already pointing at the v2 model and quoting the same global numbers).
- No PDF/PPTX deck regeneration.