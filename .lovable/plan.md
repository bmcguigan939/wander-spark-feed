# Elevator pitch → v5 (Global)

The uploaded v4 still uses UK-only narrative (£343B TAM, £444M Y5 GBV, £87.6B / £23.2B blocks). We need a v5 that mirrors the v2 Global financial model + v9 TAM/SOM workbook (£675B global TAM, £175B global SAM, UK Base Y5 £350M / £16.2M net, Global Viral Y5 £1.32B / £61.6M net).

## Deliverables

1. `scripts/build_elevator_pitch_v5.py` — generates `public/decks/Travidz_Elevator_Pitch_v5.pdf` (ReportLab, one page, landscape, mirrors v3 structure).
2. `scripts/build_elevator_pitch_v5_pptx.mjs` — generates `public/decks/Travidz_Elevator_Pitch_v5.pptx` (pptxgenjs, single slide, same layout).
3. Update `src/routes/invest.tsx` nav + hero download links from `..._v3.pdf` / `..._v3.pptx` → `..._v5.pdf` / `..._v5.pptx`.

## Copy changes (vs v4)

| Block | v4 (old) | v5 (new) |
|---|---|---|
| Header tagline | "Creator-led travel commerce · Seed round" | unchanged |
| Sub-header | "£2.5M SAFE · 18-mo runway · Next: Series A at £18M ARR run-rate" | unchanged |
| Problem | "£343B flows through OTAs…" | "£675B of global leisure-travel bookings flow through OTAs that pay creators £0…" |
| Solution | unchanged | unchanged |
| Traction | unchanged | unchanged |
| Business model | unchanged | unchanged |
| Team | unchanged | unchanged |
| Growth plan | "DEFEND · 24k cr · £444M · …" | "DEFEND · M44-60 · 24k cr · £350M UK Base · ledger + supply lock-in" |
| TAM | "£87.6B / £343B · UK / UK+EU-5" | "£87.6B / £675B · UK / Global · ONS · Eurostat · UNWTO" |
| SAM | "£23.2B / £82.9B · 36% × 80%" | "£23.2B / £175B · UK / Global · 26% creator-influenced × bookable" |
| Y5 SOM | "£444M · £20.7M · 1.9% of UK SAM" | "£350M → £1.32B · £16.2M → £61.6M net · UK Base → Global Viral · <1% global SAM" |
| The Ask | unchanged | unchanged |
| Footer URL | wander-spark-feed.lovable.app/invest | unchanged |

## Design notes (carry from v3)

- Same dark theme palette (#0a0612 bg, gradient pink→orange #ff5a8a → #ff8e72, lavender accent #c4b5fd for global figures).
- Landscape A4 / 13.33×7.5 in for PPTX.
- TAM/SAM/SOM block: highlight the global figures in lavender, UK figures in muted white to telegraph "UK funded → global upside".
- No Unicode subscripts; use `<sub>` / `<super>` tags if any super/subscript needed.

## Verification (mandatory)

1. Run both build scripts; assert exit code 0.
2. `pdftoppm -jpeg -r 150` the v5 PDF and inspect the page image for overflow, alignment, missing glyphs.
3. Convert v5 PPTX → PDF via `run_libreoffice.py` and inspect the slide image. Compare side-by-side against v4 to confirm layout parity and numbers match the v2 model.
4. `markitdown` the v5 PPTX and grep for `£343B`, `£444M`, `£82.9B`, `£20.7M`, `UK SAM` → must return zero hits.
5. Curl `/decks/Travidz_Elevator_Pitch_v5.pdf` and `.pptx` from the dev server → 200.

## Out of scope

- No new images/photography; reuse the existing v3 assets and palette.
- No changes to `compute.ts`, `assumptions.ts`, or any other section of `/invest`.
- v3 / v4 files stay in `public/decks/` (no deletes) for backward compatibility.
