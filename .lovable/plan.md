## Goal
Rebuild the full 14-slide investor deck (PPTX + PDF) so every slide reflects the **v5 global numbers** and the **£2.5M SAFE / breakeven M48** story from the updated financial model.

## What changes per slide

| # | Slide | Update |
|---|---|---|
| 1 | Title | Seed raise: **£2.0M → £2.5M** · 18-mo runway (unchanged) |
| 2 | The Window | Keep ($250B / 62% / $15T) — still current |
| 3 | The Problem | Keep (39% / 3 tabs, 8 min) |
| 4 | The Solution | Keep |
| 5 | Why Now | Keep |
| 6 | The Product | Reuse 3 product mockups from original PDF (Feed / Deal card / Checkout) |
| 7 | Market | TAM **£343B → £87.6B UK / £675B Global** · SAM **£82.9B → £23.2B / £175B** · SOM **£444M → £350M UK Base / £1.32B Global Viral** (Y5) · sources: ONS · Eurostat · UNWTO |
| 8 | Business Model | Keep tiers; tagline glide stays 4.0% → 4.65% |
| 9 | Unit Economics Y5 | **24,000 cr / £350M GBV / £16.2M net rev / 4.65%** (UK Base); add Global Viral upside line **£1.32B / £61.6M net** |
| 10 | GTM | Keep 3-phase framing |
| 11 | Growth Plan | PROVE **Seed £2M → £2.5M**, gates unchanged · SCALE Series A £8M · DEFEND Series B £20M, Y5 GBV £444M → **£350M UK / £1.32B Global** |
| 12 | Competitive | Keep quadrant |
| 13 | The Ask | **£2.0M → £2.5M Seed for 18 months** · allocation 40/35/15/10 unchanged · add new line: *"Covers EBITDA breakeven path: M48 breakeven · Y1 −£1.56M · peak deficit fully funded +£181k cushion"* |
| 14 | Closing | Update footer: "Seed · £2.0M → £2.5M" |

## Approach
1. **Build script** `scripts/build_investor_deck_seed_v2.mjs` using `pptxgenjs` — one slide per function, dark theme matching the v5 elevator deck (BG #0F172A, PRIMARY #3B82F6, CYAN #22D3EE).
2. **Reuse product images** from parsed PDF (`page_6_image_*.png`) — copy to `/tmp/deck_v2/` and embed base64.
3. **Render PDF** via LibreOffice: `soffice --convert-to pdf` on the produced PPTX → no separate reportlab script needed (keeps numbers/styling in lockstep with PPTX).
4. **Copy outputs** to `public/decks/Travidz_Investor_Deck_Seed_v2.pdf` and `.pptx`.
5. **QA**: render all 14 slides to JPEG at 130 DPI, visually inspect each for overflow, stale figures (`£343B|£82.9B|£444M|£20.7M|£2.0M`), and layout integrity. Iterate until clean.

## Output
- `public/decks/Travidz_Investor_Deck_Seed_v2.pptx`
- `public/decks/Travidz_Investor_Deck_Seed_v2.pdf`
- Both also surfaced as downloadable `<presentation-artifact>` tiles in chat.

## Out of scope
- No new slides or removed slides — same 14-slide structure.
- No changes to elevator one-pager (`Travidz_Elevator_Pitch_v5.*`) or financial model.
- No edits to typography/brand beyond matching existing dark v5 look.

## One quick confirmation
Series A (£8M) and Series B (£20M) round sizes on slide 11 — keep as-is, or update? Recommend **keep** since the financial model wasn't re-sized for downstream rounds, only the seed bumped to £2.5M.