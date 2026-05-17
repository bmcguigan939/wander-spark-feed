# Travidz Market Research v8 — full populated workbook (v6-depth, v7 numbers)

The current v7 file is sparse — 5 thin sheets with lots of whitespace. v6 was a 12-sheet investor research dossier with sources, scenarios, sensitivity, competitors and trends. v8 will restore that depth while keeping the new UK-first build and locking to `Travidz_Financial_Model_v1.xlsx`.

## Output

New file: `Travidz_Market_Research_TAM_SOM_v8.xlsx` (+ PDF). Replaces v7 as the canonical market doc.

## Workbook structure (13 sheets, ~500+ populated rows)

1. **1. Cover** — Project brief (product, ICP, revenue model, round, use of funds), global inputs (FX rates, founders, runway), colour key, methodology, commission structure summary.
2. **2. Exec Summary** — Headline TAM/SAM/SOM table, 5-year SOM build (creators, GBV, net rev), raise & runway by scenario, top 5 pitch-ready stats, creator-channel headline.
3. **3. TAM** — UK-first build (outbound + domestic, source per line), EU-5 expansion layer, bottom-up cross-check (smartphone-enabled travellers × bookable spend), reconciliation %, blended take-rate, commission pool.
4. **4. SAM** — Creator-influenced filter table per country (UK, FR, DE, ES, IT, NL): travellers × smartphone × creator-discovery share, total serviceable travellers, commissionable spend, SAM GBV + commission pool.
5. **5. SOM** — Scenario toggles (Bear/Base/Bull) for creator UA, CPI, organic multiplier, MAU activation, booker conversion, bookings/yr, basket, take-rate. 5-year build per scenario: paid installs, organic, MAU, bookers, GBV, commission. Locked to financial model in Base.
6. **6. Cohort Maturity** — Founding (500) / Power / Maturing / Mature / New tier mix by year 1-5, blended commission share, blended take-rate (4.65% Y5), tier transition logic.
7. **7. Revenue Engine** — Commission breakdown: gross 8%, tapered creator share (50/50/50/40/30 by tier), Travidz net per tier, blended monthly run-rate by year, ARPU per active creator.
8. **8. Competitors** — Booking Affiliates, TheFork, Klook, GetYourGuide, Headout, Tripadvisor Experiences, Airbnb Experiences. Columns: take-rate, creator share, model, our edge.
9. **9. Trends** — Creator-economy travel growth, Gen Z/M booking behaviour, social discovery share, short-break demand, UK staycation trend — each row with stat + source.
10. **10. Sensitivity** — Y5 net revenue tornado: ±20% on creators, GBV/creator, take-rate, churn, CAC. Two-way table: creators × GBV/creator.
11. **11. Sources** — Numbered [S1]…[S25] citations: ONS, VisitBritain, Eurostat, GWI, Phocuswright, Skift, UNWTO, WTTC, data.ai, Statista, BoE FX, ABS, Stats NZ, CSO Ireland, etc. Full URL + retrieval date.
12. **12. Rev-Share Scenarios** — Side-by-side: flat 50/50, tapered 50/40/30 (Travidz), tapered 60/50/40 (stretch). Shows Y5 net revenue under each + creator NPS impact.
13. **13. Reconciliation** — Workbook vs financial model Y1-Y5 GBV, net rev, take-rate, active creators. Zero-delta proof. Flag cells red if delta > £100k.

## Build & QA

- Use Buildstreams colour conventions: blue inputs / black formulas / green cross-sheet refs / yellow key assumptions / red flags.
- All numbers tied via formulas (no orphan hardcodes except sourced inputs).
- Number formats per xlsx skill (£#,##0;(£#,##0);- and £M / £B compaction).
- Run `recalculate_formulas.py` → assert total_errors=0.
- Convert to PDF (landscape A4, fit-to-width per sheet), render every page to JPG, inspect for: overflow, blanks, clipped charts, source legibility, reconciliation = 0.
- Iterate until clean.

## Sync after delivery

Once user reviews v8 workbook, sync any tweaked inputs back into `src/lib/investor-model/` defaults so the in-app `/admin/investor` tab stays consistent. No schema changes anticipated (v7 schema already supports UK + EU-5).

## Out of scope

- Pitch deck regeneration (separate pass once v8 approved).
- Changes to the financial model itself.
- Changes to commission logic in code.

## Sequencing

1. Build v8 workbook (single openpyxl script, ~500 lines).
2. QA every sheet visually.
3. Deliver xlsx + PDF artifacts.
4. Await sign-off → then regenerate deck slide.
