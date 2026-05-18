## Problem

The v2 workbook is full of `#VALUE!` because inserting the **Global Viral** column on the `assumptions` sheet shifted the layout but I didn't update the rest of the workbook:

```
v1:  B=Base   C=Bear   D=Bull   E=Notes   F=Active   (scenario picker)
v2:  B=Base   C=Bear   D=Bull   E=Global  F=Notes    G=Active   ← Active moved!
```

Every other sheet still reads `assumptions!$F$xx` for live values — but column F is now the text "Notes" column, so every formula that multiplies/rounds it returns `#VALUE!`. On top of that, the scenario picker formulas still say `=CHOOSE(scenario_idx, B, C, D)` — there is no 4th branch, so even selecting Global Viral wouldn't pull the new column.

## Fix

Rebuild `Travidz_Financial_Model_v2_Global.xlsx` correctly. One script, three passes:

1. **Repoint every cross-sheet reference from column F → column G** on `assumptions`. Sweep `creator_cohorts`, `headcount_uk`, `operator_supply`, `combined_pnl_cash`, `summary_dashboard`, `channel_cac`, `global_viral_summary` for `assumptions!$F$` / `assumptions!F` and rewrite to `$G$` / `G`.
2. **Extend the scenario picker to 4 branches** on every Active-column formula in `assumptions` column G: `=CHOOSE(scenario_idx, B, C, D)` → `=CHOOSE(scenario_idx, B, C, D, E)`. Confirm `scenario_idx` (named range on `summary_dashboard`) accepts 1–4; widen its data-validation list to include "Global Viral".
3. **Verify `global_viral_summary` and `regions`** formulas reference the now-shifted Active column (G) where appropriate, or stay locked to column E if they're meant to be Global-Viral-only views.

## QA

- Run `recalculate_formulas.py` on the workbook.
- Assert zero `#VALUE! / #REF! / #DIV/0! / #NAME?` across all sheets.
- Convert all sheets to images and visually confirm:
  - With `scenario_idx = 1` (Base): Y5 numbers match v1 (~£350M GBV / ~£16M Travidz net).
  - With `scenario_idx = 4` (Global Viral): Y5 ≈ £1.7B GBV / ~£79M net, ~120k creators.
- Save to `/mnt/documents/Travidz_Financial_Model_v2_Global.xlsx` and copy to `public/decks/` so the `/invest` download link picks it up.

## Out of scope

- No changes to `/invest` page (it's already pointing at the v2 file).
- No changes to the runtime React model in `src/lib/investor-model/*`.
- No PDF/PPTX regeneration.

## Outcome

The workbook recalculates cleanly across all four scenarios, the "Global Viral" column actually flows through every sheet, and the same file at `/decks/Travidz_Financial_Model_v2_Global.xlsx` keeps working on the live `/invest` page.