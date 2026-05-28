## Goal

Produce `Travidz_Operator_Mix_Q11.xlsx` in `/mnt/documents/` — a standalone, formula-driven workbook (no external links to the v6 model) that demonstrates how Travidz's operator mix supports the 11% gross commission line used in Q11 of the Paul response.

Only two operator categories are in the revenue model (per Q11): **Stays** and **Tours / Experiences**. Restaurants are explicitly excluded.

## Workbook structure (5 sheets, Arial, standard colour conventions: blue = input, black = formula, green = cross-sheet)

### 1. `README`
Plain-language context: what Q11 asked, what 11% means (gross commission, not blended margin), what's in scope (stays + experiences only), source notes pointing to `src/lib/commission.ts` (`COMMISSION.totalPct = 11`) and `src/lib/investor-model/assumptions.ts` (`grossCommissionPct: 0.11`).

### 2. `Industry_Benchmarks`
Reference table of published direct-channel commission ranges per operator type, each row sourced (Booking.com, Expedia partner docs, GetYourGuide, Viator, Airbnb Experiences). Columns: Category · Sub-type · Low % · Mid % · High % · Source. This is the evidence base the mix sheet pulls from.

Rows include: independent hotel direct, boutique/lifestyle, branded chain wholesale, B&B/guesthouse, vacation rental, day tour, multi-day tour, activity/experience, ticketed attraction.

### 3. `Mix_Scenarios` (the core "supports 11%" sheet)
Three named scenarios — Conservative / Base / Stretch — each computing a weighted blended commission. Layout:

```
                          Conservative   Base    Stretch
Stays % of GBV               75%         70%     60%
Tours/Experiences % of GBV   25%         30%     40%
                            ----        ----    ----
Stays commission %            9.0%       10.0%   11.0%
Tours/Exp commission %       16.0%       18.0%   20.0%
                            ----        ----    ----
Blended gross commission   =SUMPRODUCT  =SP     =SP    ← target ≈ 11%
Variance vs 11% target     =B-0.11      ...     ...
```

All cells formula-driven (`SUMPRODUCT`), with the mix % and per-category commission % pulled from `Industry_Benchmarks` via cell refs where possible. Base scenario must compute to ≈ 11.0% (within 25bps) to validate the headline.

### 4. `Sensitivity`
2-D data table: rows = Stays share of GBV (50% → 90% in 5pt steps); columns = Tours/Experiences commission % (12% → 22% in 2pt steps). Body cells = blended gross commission. Conditional formatting (yellow band) highlights cells where blended ≈ 10.5%–11.5%, visually showing the wide region of operator mixes that all support an 11% headline.

### 5. `Reconciliation_to_Net_Take`
End-to-end walk on a £100 booking using v6 mechanics, so the reader can trace 11% gross → 4.65% Travidz net:

```
GBV                                  £100.00
Gross commission (11%)              =B*0.11
Stripe variable (2.9%)              =B*0.029
Stripe fixed (£0.20)                 0.20
Stripe total                        =SUM
Net pool (gross − Stripe)           =formula
Creator share (Y5 blended ~57.5%)   =formula
Travidz net                         =formula
Travidz take rate of GBV            =formula  ← lands ≈ 4.65%
```

Tier split table (Founding/Power/New 50/50, Maturing 60/40, Mature 70/30) shown alongside, with the Y5 tier mix from `assumptions.ts` (`tierMixByYear[4]`) driving the blended creator share via `SUMPRODUCT`.

## Build steps

1. Read `src/lib/investor-model/assumptions.ts` for exact `tierMixByYear`, `creatorSharePctByTier`, `grossCommissionPct`, `stripeVariablePct`, `stripeFixedPerTxn` values so Sheet 5 reconciles to the live model.
2. Generate workbook with `openpyxl` (Arial 10pt, blue inputs, black formulas, yellow conditional formatting on Sensitivity), every calc as a real formula — no hardcoded results.
3. Run `knowledge://skill/xlsx/scripts/recalculate_formulas.py` to materialise values and confirm zero formula errors.
4. QA: open the recalculated file with pandas, print Base blended commission and Y5 take rate, confirm ≈ 11.0% and ≈ 4.65%; if off, adjust Base mix % in code and re-run.
5. Deliver via `<presentation-artifact>` pointing at `Travidz_Operator_Mix_Q11.xlsx`.

## Out of scope

- No edits to the live v6 model workbook, the Paul response doc, or any deck script.
- No code/UI changes in the app.
