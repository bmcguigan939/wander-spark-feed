## Update Travidz TAM/SAM/SOM workbook (v2)

**Scope:** Revise uploaded `Travidz_Market_Research_TAM_SOM.xlsx` → deliver `Travidz_Market_Research_TAM_SOM_v2.xlsx`.

### Changes

1. **Currency → GBP only**
   - All monetary values in £ GBP. Strip $/€ from headers, formats, labels.
   - Single FX input block on Cover (USD→GBP, EUR→GBP) cited on Sources sheet; all conversions formula-driven.
   - Number formats: `£#,##0;(£#,##0);-` (with `"bn"` / `"m"` scalers where used).
   - TheFork €2/cover converted via FX cell, not hardcoded.

2. **Horizon → 5 years, with 3-year funded runway**
   - Extend SOM Scenarios (Conservative / Base / Stretch) from Y1–Y3 to **Y1–Y5**.
   - Extend Exec Summary dashboard, chart data, Revenue Engine repeat curve, and Sensitivity terminal-year to Y5.

3. **Founders' salary built into raise calculation**
   - New **"Raise & Runway"** block (on SOM Scenarios sheet, also surfaced on Exec Summary):
     - Input: **2 founders × £7,500/mo = £15,000/mo** from Month 1 (£180k/yr, £540k over 3-yr runway). Input cells in blue so investors can flex.
     - Add operating-cost stack alongside: founders salary (hardcoded above), UA spend (already modelled), tooling/infra placeholder, contingency %.
     - Compute **cumulative Y1–Y3 cash burn = salaries + UA + opex − commission revenue**.
     - Output: **Required Raise = cash burn over 3-yr runway + buffer**, shown for all three scenarios. This becomes the recommended pre-seed ask (validates/replaces the £500–750k placeholder).
     - Break-even check: month/quarter where monthly commission ≥ monthly burn.
   - Y4–Y5 modelled post-runway with toggle: revenue-funded vs. Seed top-up.

4. **Sheets touched:** Cover/Methodology (currency + horizon + salary assumption notes), Exec Summary (new Raise headline tile), TAM, SAM, SOM Scenarios (5-yr columns + Raise & Runway block), Revenue Engine, Sensitivity, Sources (FX citation). Competitors / Trends: currency labels only.

### Build steps

1. Copy uploaded `.xlsx` to `/tmp/`, load with `openpyxl`.
2. Add FX + founders-salary input cells on Cover; wire monetary formulas to them.
3. Extend Y3 column blocks to Y5; insert Raise & Runway block.
4. Apply GBP number formats across all sheets.
5. Save to `/mnt/documents/Travidz_Market_Research_TAM_SOM_v2.xlsx`.
6. Run `recalculate_formulas.py`; fix any #REF / #DIV.
7. Render each sheet to PNG for QA; fix overflow/clipping; iterate until clean.
8. Deliver via `<presentation-artifact>` with summary of: 5-yr GBP TAM/SAM/SOM headlines, **recommended raise size** (Base case), and break-even month.

### Out of scope
Pitch deck and SaaS financial model — built next, consuming this workbook.
