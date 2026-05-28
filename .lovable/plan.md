## Goal

Update Travidz TAM/SAM/SOM to align with the **v6 Financial Model** and **v6 Elevator Pitch** that the user attached. Today there are three sources of truth and they disagree:

| Source | Y5 UK SOM (GBV) | UK TAM | UK SAM | Y5 Take | Round |
|---|---|---|---|---|---|
| v6 Financial Model (attached) | £444M | £87.56B | £25.22B | n/a | n/a |
| v6 Elevator Pitch (attached) | £444M → £1.32B | £87.6B / £675B Global | £25.2B / £175B Global | 4.65% | £2.5M SAFE |
| Live `/invest` page (`assumptions.ts → GLOBAL_MARKET`) | **£350M** ❌ | £87.6B | £25.2B | 4.65% | n/a |
| Standalone workbook (`…TAM_SOM_v10_Global.xlsx`) | £444M (chart) but headline stats say "£350M (UK Base)" ❌; calls commission "8% pool" ❌; Seed "£2.0M" ❌ | £89.75B ❌ | £23.20B ❌ | 4.68% | £2.0M ❌ |

The pitch and the financial model agree. The in-app constants and the standalone workbook are stale.

## Changes

### 1. `src/lib/investor-model/assumptions.ts` — update `GLOBAL_MARKET` Y5 anchors

```ts
export const GLOBAL_MARKET = {
  bookingsPerTraveller: 1.5,
  samPct: 0.26,
  somGBVBaseY5: 444_000_000,      // was 350_000_000 — v6 Y5 = 24k × £18.5k
  somNetBaseY5: 20_800_000,       // was 16_290_000 — v6 model Y5 net (≈4.68% take)
  somGBVGlobalY5: 1_322_400_000,  // unchanged — workbook + pitch agree
  somNetGlobalY5: 61_900_000,     // unchanged
};
```

No other file changes — `/invest` market panel and reconciliation banners read these constants automatically.

### 2. Produce new standalone workbook → `/mnt/documents/Travidz_Market_Research_TAM_SOM_v11_Global.xlsx`

Replaces v10. Same overall structure (so investors can diff against v10) but every headline now matches the v6 model + pitch. Sheets:

1. **README** — what changed vs v10, with a one-line diff table; commission framework restated correctly (11% gross, Stripe shared off the top, tiered 50/50/50/40/30 split — **not** "8% pool").
2. **Inputs** — UK travellers 178.7M, ABV £490, bookings/traveller 1.0, SAM% 28.8%, gross commission 11%, Stripe 2.9% + £0.20, EU-5 multiplier 2.91× — all sourced and matching the v6 Assumptions sheet exactly.
3. **TAM** — formula-driven: UK = 178.7M × 1.0 × £490 = **£87.56B**; UK+EU-5 = **£342.37B**; Global = sum of GLOBAL_REGIONS (UK 25M×£480 + EU-5 150M×£460 + USA 180M×£540 + … × 1.5 bookings) → headline rounded to **£675B** to match pitch, with the precise computed figure shown below.
4. **SAM** — UK SAM **£25.22B**, UK+EU-5 SAM **£98.60B**, Global SAM **£175B** (26% of Global TAM, matches pitch).
5. **SOM_UK_Base** — 5-year build: creators [500, 2400, 6800, 14000, 24000] × £18.5k → GBV [£9.25M, £44.4M, £125.8M, £259.0M, **£444.0M**]; tier mix from v6 (Y5 = 0/32/40/20/8); commission walk → Travidz net **~£20.8M Y5** at blended **~4.68%** take rate.
6. **SOM_Global_Viral** — upside path: creators [1.5k, 9k, 32k, 70k, **120k**] × blended £11k → GBV ramp to **£1.32B**, net **£61.9M Y5**. (Unchanged from v10, kept for continuity.)
7. **Scenarios** — Bear / Base / Bull mirroring the v6 model's Scenarios sheet (Bear ~40% Base, Bull ~1.6× Base, Bull ABV £560).
8. **Executive_Summary** — investor headline page with the corrected "Top 5 stats":
   - £675B Global TAM · £342B UK+EU-5 · £87.6B UK
   - 11% gross commission · 4.65% Y5 blended net take
   - Y5 SOM range £444M (UK Base) → £1.32B (Global Viral) — both <1% of Global SAM
   - Founding 5,000 cap · 50/50 locked 24 months
   - Seed **£2.5M SAFE** → Series A at **£18M ARR run-rate**
9. **Reconciliation_to_v6_Model** — side-by-side workbook vs v6 model values with a zero-delta check column.
10. **Sources** — numbered [S1]…[S25] citations (ONS, VisitBritain, Eurostat, UNWTO, WTTC, GWI, Phocuswright, Skift, Expedia P2P, Stripe).

All numbers formula-driven from the Inputs sheet — no hardcoded outputs. Standard colour conventions (blue = input, black = formula, green = cross-sheet, yellow = key assumption). After build, run `recalculate_formulas.py`, then QA: open with pandas and assert UK TAM ≈ £87.56B, UK Y5 SOM = £444M, Y5 take rate within 10bps of 4.65%.

## Out of scope

- No edits to the v6 financial model workbook, the elevator pitch, or the Paul response doc — those are already aligned.
- No changes to commission, tier, or Stripe logic in `src/lib/commission.ts` — only the `GLOBAL_MARKET` Y5 anchors move.
- No UI/route changes; the `/invest` market panel will pick up the new anchor values automatically.

## Deliverables

1. Updated `src/lib/investor-model/assumptions.ts` (4-line numeric change in `GLOBAL_MARKET`).
2. New `Travidz_Market_Research_TAM_SOM_v11_Global.xlsx` delivered via `<presentation-artifact>`.
