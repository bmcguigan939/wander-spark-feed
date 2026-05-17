# Investor-ready TAM / SAM / SOM v7

Goal: make the market sizing defensible to a seed investor and reconcile it line-for-line with `Travidz_Financial_Model_v1.xlsx` (Y5 GBV £444M, Y5 net £20.7M, blended take-rate 4.65%).

## Problems with the current v6

1. **TAM scope is fuzzy** — "UK + key EU travel" with no source. The financial model and hiring plan are UK-first, so investors will challenge the geography.
2. **SOM is top-down only** — driven by a "% of SAM" slider with no link to the creator funnel. Investors want bottom-up.
3. **No sources** — every input is hardcoded with no citation. Fails first DD question.
4. **Net revenue & take-rate missing from market view** — only GBV is shown; deck needs the £20.7M Y5 net + 4.65% take-rate front-and-centre.
5. **No reconciliation slide** — nothing shows that £444M Y5 GBV from the cohort model fits inside the SOM ceiling.

## What v7 will deliver

### 1. New workbook: `Travidz_Market_Research_TAM_SOM_v7.xlsx`

Buildstreams-style, 5 sheets, every input cell sourced:

- **`tam_sam`** — UK-first build:
  - TAM = UK outbound + domestic leisure travel spend (ONS Travel Trends + UK Tourism Statistics + VisitBritain)
  - +EU-5 expansion layer (France, Germany, Spain, Italy, Netherlands) shown separately so investors see the UK-only floor and the EU-5 expansion ceiling
  - SAM = creator-influenced share of leisure travel (cite GWI / Expedia Path-to-Purchase / Phocuswright social-discovery stats)
  - All sources in adjacent cells per xlsx skill convention
- **`som_bottom_up`** — creators × GBV/creator × 5y curve, pulling the **same** 500 → 24,000 anchors and £18,500 GBV/creator from the financial model. Output: Y1–Y5 GBV, net revenue, take-rate matching `combined_pnl_cash` exactly.
- **`som_top_down`** — % of SAM capture by year, as a sanity check. Flags red if bottom-up SOM > 5% of SAM (unrealistic) or > SAM (broken).
- **`reconciliation`** — side-by-side Y1–Y5: financial model GBV vs bottom-up SOM vs top-down SOM ceiling, with delta column. Must be zero delta vs financial model.
- **`summary`** — investor-ready one-pager: TAM £X, SAM £Y, SOM Y5 £444M GBV / £20.7M net, take-rate 4.65%, with charts.

Build with openpyxl, recalc via `recalculate_formulas.py` → assert `total_errors: 0`, render to PDF + JPGs, QA every page.

### 2. Sync `src/lib/investor-model/`

- Replace `V6_DEFAULTS` with `V7_DEFAULTS` in `assumptions.ts` — same creator anchors (already correct), but:
  - Split `tamTravellers` into `tamUKTravellers` + `tamEU5Travellers` with separate average booking values
  - Replace the `somSharePctByYear` slider's role: keep it as a **ceiling check** input, not the SOM driver
- Update `compute.ts` `computeMarket()` to expose `somBottomUpGBVByYear` (creator-driven, matches financial model) alongside the existing top-down `somGBVByYear`, plus a `reconciliation` field.
- Update `src/routes/admin.investor.tsx` Market tab:
  - Show TAM (UK only) and TAM (UK+EU5) as two cards
  - SOM card switches to bottom-up Y5: £444M GBV / £20.7M net / 4.65% take-rate
  - Add reconciliation strip: bottom-up vs top-down ceiling, with green tick when within bounds

### 3. Update the investor deck

Rebuild the TAM/SAM/SOM slide in `Travidz_Investor_Deck_Seed_v1.pptx` → `_v2.pptx`:
- Three-tier funnel visual: TAM → SAM → SOM (Y5)
- SOM panel shows £444M GBV / £20.7M net / 4.65% take-rate with "bottom-up from 24,000 creators" caption
- Footnote citations for every TAM/SAM number
- Re-export PDF, QA each slide

## Out of scope

- No changes to the financial model (it's the source of truth)
- No changes to commission logic, hiring plan, or burn
- No new database tables or server functions
- Slides other than TAM/SAM/SOM stay untouched in this pass

## Sequence

1. Build v7 workbook + QA
2. User reviews v7 workbook & sources
3. On approval: sync `investor-model/` code + admin tab
4. Rebuild deck slide, re-export PDF

## Technical notes

- Workbook: openpyxl, Buildstreams colour conventions (blue inputs, black formulas, green cross-sheet refs, yellow = source cell). Number formats per xlsx skill (`£#,##0;(£#,##0);-`, `0.00%`, `0.0x`).
- TS changes are surgical to `assumptions.ts`, `compute.ts`, `admin.investor.tsx` — no breaking changes to consumers of `computeRevenue` (Y5 GBV stays £444M).
- Deck: edit existing pptx via unpack/repack workflow per pptx skill, not full rebuild.
