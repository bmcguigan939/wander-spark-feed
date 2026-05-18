## Goal
Layer a **Global Viral** scenario on top of the existing UK-led v1 financial model (~5× the current Y5 base) and surface it on `/invest`.

## 1. New workbook: `Travidz_Financial_Model_v2_Global.xlsx`
Saved to `/mnt/documents/` and copied to `public/decks/` for the live pitch.

### Changes vs v1
- Add a 4th scenario column **"Global Viral"** alongside Base / Bear / Bull on the `assumptions` sheet.
- Rewrite `summary_dashboard` formulas to support scenario index 4.
- Keep all existing UK Base/Bear/Bull intact — Global Viral is purely additive.

### Global Viral assumptions (Y5 anchor)

| Lever | UK Base | Global Viral |
|---|---|---|
| TAM travellers (reachable) | 85M | **520M** (UK + EU‑5 + USA + AUS/NZ + LATAM + MENA + Africa + India + SEA + Greater China leisure travellers) |
| Avg booking value (£, blended) | 480 | **410** (lower-ABV emerging markets dilute UK/US/AUS) |
| SAM % of TAM | 28% | **26%** |
| Active creators @ M12 / M24 / M36 / M48 / M60 | 500 / 2.4k / 6.8k / 14k / 24k | **1,500 / 9k / 32k / 70k / 120k** |
| GBV/active/mo @ M60 | £1,540 | **£1,180** (blended across regions) |
| Tier mix | unchanged | unchanged |

### Implied Y5 (Global Viral, base case)
- **Active creators:** ~120,000
- **Annual GBV:** ~£1.70B
- **Travidz net revenue:** ~£79M
- **EBITDA (rough, scaled OpEx):** ~£28–35M positive
- ~5× the current UK Y5 net revenue, still <0.4% of the global SAM (lots of headroom).

### New `regions` sheet
Per-region build for Y5 showing creator count, ABV, GBV, Travidz net for: UK, EU‑5, USA, Australia/NZ, LATAM (Brazil-led), MENA, Africa, India, SEA, Greater China. Totals tie back to the Global Viral column.

### QA
Run `recalculate_formulas.py`, inspect every sheet, fix any `#REF!` / `#DIV/0!`, then convert to images to visually QA before delivering.

## 2. Update `/invest` page
Add a new **"Global expansion"** section between Market and Growth plan in `src/routes/invest.tsx`:
- Headline: *"UK is the wedge. The model is global."*
- 10 region chips with traveller-pool sizes.
- Y5 comparison card: UK-only (£350M GBV / £16M net) vs Global Viral (£1.7B GBV / £79M net).
- One line of honest framing: "Illustrative — assumes one breakout region per year and a TikTok-style creator loop. UK Base remains our funded plan."
- Replace the linked deck on the page with the new v2 workbook (`/decks/Travidz_Financial_Model_v2_Global.xlsx`).

## Out of scope
- No changes to PDFs / pptx decks (can regenerate as a follow-up).
- No changes to commission engine, tier logic, or `src/lib/investor-model/*` runtime model (that powers a different interactive section and stays UK-focused unless you want it swapped too — say the word).

## Outcome
You get a v2 Excel attachment for Paul that shows the global viral upside while keeping the disciplined UK base case, and `/invest` gets a Global expansion section that tells the same story visually.