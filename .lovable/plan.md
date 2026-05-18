## Goal

Bring the **TAM / SAM / SOM** numbers on `/invest` and in `src/lib/investor-model/` in line with the **v2 global financial model**, so the Market section reflects the same world that the v2 workbook does (UK + EU-5 + USA + AUS/NZ + LATAM + MENA + Africa + India + SEA + Greater China).

## What changes

### 1. Market constants in `src/lib/investor-model/assumptions.ts`

Add a global market layer alongside the existing UK base, derived from the v2 workbook's `regions` sheet:

| Lever | Today (UK + EU-5) | After |
|---|---|---|
| Reachable travellers (global) | — | **1.22B** (sum of regions sheet: UK 25M + EU-5 150M + USA 180M + AUS/NZ 18M + LATAM 110M + MENA 70M + Africa 90M + India 140M + SEA 160M + Greater China 280M) |
| Blended ABV (global) | £490 (UK) | **~£380** (region-weighted from workbook) |
| Attach rate | 1.0 | **1.5 bookings/yr** (matches Global Viral column) |
| SAM % | 28.8% | **26%** (matches Global Viral) |
| **Global TAM (GBV)** | £343B (UK + EU-5) | **~£700B** (1.22B × 1.5 × £380) |
| **Global SAM (GBV)** | £99B | **~£180B** |

Add a new field `regionTravellersM` (per region) so the Market and Global Expansion sections share one source of truth.

### 2. Update `computeMarket` in `src/lib/investor-model/compute.ts`

Extend the returned `MarketSizing` with:

- `tamGBVGlobal` — global TAM (1.22B travellers × attach × blended ABV)
- `samGBVGlobal` — global SAM
- `somGBVBaseY5` — UK Base Y5 (`~£350M`, unchanged)
- `somGBVGlobalY5` — Global Viral Y5 (`~£1.32B`, from workbook)

The existing UK-only fields stay so nothing else breaks.

### 3. `/invest` page — `src/routes/invest.tsx`

- **Hero stat strip** (line 156-167): swap `{ TAM: "£343B" }` for `{ TAM: "£700B" }` global, keep Y5 GBV `£444M` (UK Base, what the SAFE underwrites), keep Take `4.65%`.
- **Market section** (line 410-426): make the three KPI cards explicit about scope:
  - **Global TAM:** `~£700B` (sub: "1.22B leisure travellers, ONS / Eurostat / UNWTO")
  - **Global SAM:** `~£180B` (sub: "26% creator-influenced × bookable")
  - **Y5 SOM:** dual line — `£350M UK Base · £1.32B Global Viral` (sub: net £16M / £62M)
- **SAM penetration bars** (line 428-447): switch the bars to **Global SAM penetration** with both UK Base and Global Viral tracks, so investors see we're <0.05% of global SAM even in the bull case.
- **Global expansion section** (line 454-548): keep as-is — already correct from the v2 model — just re-link to the same workbook (already done).

### 4. Out of scope

- No changes to the workbook itself (already correct after last turn).
- No changes to the runtime creator funnel (`creatorsActiveByYear`, `gbvPerActiveCreator`) — Y5 numbers stay the same.
- No PDF / PPTX deck regeneration.
- No changes to other surfaces (admin, calculator).

## Outcome

`/invest` Market section tells the truth the v2 workbook now models: **£700B global TAM, £180B SAM, UK SOM £350M Y5, Global Viral SOM £1.32B Y5**. UK Base remains the funded plan; global is the optionality narrative.