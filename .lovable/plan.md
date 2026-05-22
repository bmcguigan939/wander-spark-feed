## Goal

Refresh `Travidz_Market_Research_TAM_SOM_Global.xlsx` → save as **v10** so every assumption, formula, and headline reconciles to the v6 financial model:
- Gross commission **8% → 11%**
- Stripe **2.9% + £0.20/txn** deducted from gross commission *before* the split (shared)
- Tiered creator share (50/50/50/40/30) applied to the **net pool**
- Refunds/chargebacks/FX still absorbed by Travidz alone

## Sheets to update

**1. Cover**
- Title → "Market Research v10 (TAM / SAM / SOM · Global)"; reconciled to `Travidz_Financial_Model_Global_v6.xlsx`.
- Revenue model line → "11% gross commission; Stripe 2.9% + £0.20/txn shared off the top; tapered 50/50/50/40/30 creator share by tier."
- Commission Structure block:
  - C20 `0.08` → `0.11`
  - Add rows for Stripe % (`0.029`) and Stripe fixed (`0.20`) with [S-Stripe] source.
  - Keep tier shares 0.5 / 0.5 / 0.5 / 0.4 / 0.3 (unchanged).

**2. Exec Summary**
- Subtitle + headline stat: recompute Y5 SOM net using v6 take rates (UK Base **~4.67%**, Global Viral **~4.69%**).
- Commission-pool columns (E, H) → multiply by `0.11` instead of `0.08`.
- Top-5 stats: update "Travidz pays creators 30–50% of 11% commission (net of Stripe)" and Y5 SOM range to v6 numbers.
- Global Viral block (rows 38–40): replace hardcoded `0.05/0.049/0.048/0.0472/0.0465` with links to `5. SOM` Global Viral take row (driven from Cohort Maturity at 11% net of Stripe).

**3. TAM**
- F30 blended take-rate `0.08` → `0.11`; comment: "Restaurants ~4%, hotels 4–6%, tours/experiences 10–25% → blended 11% target post-MoR repricing."
- F31 commission pool auto-recomputes.
- No traveller/spend inputs change.

**4. SAM** — no input changes; downstream commission-pool refs follow F30 (now 11%).

**5. SOM** (core change)
- Row 24 "Gross commission (8% of GBV)" → 11% of GBV (formula `=Cx*0.11`).
- Add row "Stripe processing (2.9% × GBV + £0.20 × txns)" — for now approximate as `=GBV * 0.029` (fixed-fee portion immaterial at scale; flag in note) OR pull txn count from a new assumption (avg basket £). Keep simple: use `GBV * 0.029` + `(GBV/avg_basket)*0.20`, with `avg_basket` cell on Cover sheet (default £350, sourced from Phocuswright avg booking value).
- Row 22 "Blended Travidz take rate" → replace hardcoded values with link to `6. Cohort Maturity` G26 series (now driven off 11% net of Stripe).
- Row 23 Travidz net revenue auto-recomputes.
- Row 25 Creator payout → `= (Gross commission − Stripe) × creator share %` from Cohort Maturity.
- Scenario block (rows 29–33): same restructure; Bear/Bull take rates recomputed off new blended formula.

**6. Cohort Maturity**
- Replace constant `0.08` in B26/Travidz-take rows with `(0.11 − stripe%)` net pool, then `× Travidz share`.
- Specifically: rows 24/25 unchanged (tier shares 50–30%); row 26 becomes `= (0.11 − 0.029 − fixed_per_£) × C25`. Add a clarifying note row explaining the shared-Stripe deduction.

**7. Revenue Engine**
- Row 8 "Gross commission (8%)" → 11%.
- Insert new row "Less: Stripe processing (shared)" between gross commission and creator payout.
- Row 9 Creator payout → `= (Gross − Stripe) × Cohort creator share`.
- Row 10 Travidz net revenue → `= Gross − Stripe − Creator payout`.
- Row 11 blended take auto-flows.

**10. Sensitivity**
- Replace hardcoded `0.0465` with link to `5. SOM` Y5 take cell.
- Two-way table recomputes against new base.

**13. Reconciliation** (if present) — re-point links from v2 financial model to v6, verify zero delta on Y5 GBV and Y5 Travidz net for both UK Base and Global Viral.

## QA

1. Recalculate via `recalculate_formulas.py`; ensure zero `#REF!/#DIV/0!`.
2. Verify Y5 Base Travidz net ≈ £16.3M (UK) and Global Viral Y5 ≈ £61.9M, matching v6 financial model.
3. Convert each sheet to PNG and inspect for layout, formatting, and stale "8%" labels.
4. Save as `Travidz_Market_Research_TAM_SOM_v10_Global.xlsx` in `/mnt/documents/`.

## Out of scope
- No new TAM regions, no traveller-count revisions.
- Refunds/chargebacks/FX leakage stays out of the SOM (Travidz-only, financial-model side).
