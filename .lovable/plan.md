## Goal

Bring the live investor page at `/invest` (and its underlying model assumptions) in line with the **v6 financial model** and the new **v10 TAM/SOM** workbook:

- Ask: **£2.0M SAFE** (was £2.5M)
- Commission: **11% gross**, Stripe **2.9% + £0.20/txn** shared off the top, then tiered **50/50/50/40/30** split
- Blended Y5 take rate: **~4.68%** (UK Base) / **~4.69%** (Global Viral)
- Y5 Travidz net: **£16.3M** UK Base · **£61.9M** Global Viral
- Download links: financial model **v6**, market research **v10**

## Files to update

### 1. `src/lib/investor-model/assumptions.ts`
- `grossCommissionPct: 0.08` → **0.11**
- Add `stripeVariablePct: 0.029`, `stripeFixedPerTxn: 0.20`, `avgBookingValue` already exists (used as basket). Document that Stripe is shared off the top.
- Update `GLOBAL_MARKET.somNetBaseY5` → `16_290_000` and `somNetGlobalY5` → `61_900_000` (recomputed against v6).
- Rename comment block from "v7 defaults" → "v6 financial-model defaults / v10 market workbook".

### 2. `src/lib/investor-model/compute.ts`
- In `computeRevenue`, deduct shared Stripe before the tier split:
  - `stripeFee = gbv * stripeVariablePct + (gbv / avgBookingValue) * stripeFixedPerTxn`
  - `netPool = grossCommission - stripeFee`
  - `creatorPayout = Σ gbvByTier[t] * (netPool/grossCommission) * creatorSharePctByTier[t]` (equivalent to applying tier share to `netPool` weighted by tier-GBV share)
  - `travidzNet = netPool - creatorPayout`
- Add `stripeFee` to `RevenueYear` for transparency.
- `blendedTakeRatePct` continues to be `travidzNet / gbv`.

### 3. `src/routes/invest.tsx` — copy + numbers
- **Meta description / og:description**: "£2.0M SAFE" instead of £2.5M.
- **Hero**:
  - Sticky-bar pill: `Seed · £2.0M SAFE · Open`.
  - Hero stat cards: keep TAM £675B; Y5 GBV unchanged (£350M → £1.32B); **Take "4.68%"** (was 4.65%).
- **Sticky bar download buttons**:
  - "Model v2" → **"Model v6"** → `/decks/Travidz_Financial_Model_Global_v6.xlsx`
  - "Market v9" → **"Market v10"** → `/decks/Travidz_Market_Research_TAM_SOM_v10_Global.xlsx`
- **BusinessModel section**:
  - Stat cards: "Take rate 4–7% · Blended Y5: 4.68%"; "Creator share 30–50% of **net** commission (post-Stripe)".
  - Slider math: replace hardcoded `gbv * 0.0465` with `gbv * 0.0468`, label updated.
  - Add a one-liner under the slider explaining "Net = 11% gross − Stripe 2.9% + £0.20/txn − tiered creator share".
- **HowItWorks** step 03 description: "30–50% of net commission" (already says net — keep).
- **GlobalExpansion**:
  - `compare` table values: Y5 Travidz net **£16.3M** (UK), **£61.9M** (GV); take rates **4.68% / 4.69%**.
  - Footer caption: "v6 global model · reconciled to v10 TAM/SOM".
  - Download buttons: same file path updates as sticky bar.
- **TheAsk**:
  - Headline: **"£2.0M SAFE · 18-month runway."**
  - Sub: "Next: Series A £8M at £2M ARR (M22). Target KPIs at next round: 8k active creators, £40M annualised GBV, 4% blended take."
- **FooterCTA** small caption: `… v6 financial model · v10 market workbook`.
- All references to "v9 market model" / "v2 model" → v10 / v6.

### 4. `public/decks/` — copy new artifacts
- Copy `/mnt/documents/Travidz_Financial_Model_Global_v6.xlsx` → `public/decks/Travidz_Financial_Model_Global_v6.xlsx`
- Copy `/mnt/documents/Travidz_Market_Research_TAM_SOM_v10_Global.xlsx` → `public/decks/Travidz_Market_Research_TAM_SOM_v10_Global.xlsx`
- Leave the older v2 / v9 files in place (no need to delete; broken links would otherwise show).

### 5. (Optional) `src/routes/admin.investor.tsx` and `src/routes/business.calculator.tsx` / `creator.calculator.tsx`
- If they re-import `V6_DEFAULTS` or `computeRevenue`, they'll automatically pick up the new 11% / Stripe-net math — no edits needed.
- If any of them hardcode `0.08` or `0.0465`, fix in-place. Verify after the assumptions edit.

## Verification

1. Type-check passes (handled by harness).
2. Manual sanity in browser preview: hero shows £2.0M, take 4.68%, Global Viral table reads £61.9M.
3. Click each download button → file resolves (200, not 404).
4. Calculator math on `/creator/calculator` produces the same net Travidz % the financial model does.

## Out of scope
- No new sections, no design overhaul. Copy + numbers + downloads only.
- No PDF deck regen (still links to `Travidz_Elevator_Pitch_v5.pdf`) — flag in the response if you want me to refresh that too.
