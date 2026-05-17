
# Travidz — Market Research & TAM/SAM/SOM Plan

## Objective
Deliver an investor-grade Excel workbook (`/mnt/documents/Travidz_Market_Research_TAM_SOM.xlsx`) that doubles as the data backbone for the pitch deck and SaaS financial model.

## Positioning baked into the model
- **Product:** mobile-first creator-led travel discovery app (map + video) monetised via affiliate commission (TheFork, Booking.com, Viator).
- **ICP:** global English-speaking leisure travellers (UK, US, CA, AU, NZ, IE + English-speaking outbound from EU/Asia).
- **Round:** pre-seed, raising £500k–£750k for 3-year runway. SOM must show credible path to break-even traction inside 3 years.

## Research scope (desk research, cited sources only)
Pulled from UNWTO, Statista, Phocuswright, Skift Research, Booking.com investor reports, Tripadvisor 10-K, TheFork/Tripadvisor disclosures, Awin network reports, GWI travel reports, App Annie/data.ai, EU Tourism stats, and Companies House filings of comparators.

Comparators benchmarked: **Polarsteps, Wanderlog, Atlas Obscura, Beli, Rezdy, TheFork, Tripadvisor, Hopper, Culture Trip, Sidekick**.

## Excel workbook structure (10 sheets)

1. **Cover & Methodology** — scope, assumptions, colour key (blue=input, black=formula, green=cross-sheet, yellow=key assumption), data-source legend.
2. **Executive Summary** — TAM / SAM / SOM headline table + 3-yr SOM chart data + key takeaways for the deck.
3. **TAM — Global** — top-down: 1.4bn intl arrivals × English-speaking share × smartphone penetration × avg annual bookable spend × blended affiliate take-rate. Bottom-up cross-check via global online travel GBV.
4. **SAM — Serviceable** — English-speaking outbound travellers actively using discovery apps, filtered to restaurants + tours + hotels in cities where TheFork/Booking/Viator have inventory. Country-by-country breakdown (UK, US, CA, AU, NZ, IE + key EU outbound).
5. **SOM — 3-Year** — bottom-up funnel: marketing spend → installs → MAU → bookers → bookings/yr → GBV → commission. Three scenarios (Conservative / Base / Stretch). Yearly P&L-ready outputs feed the financial model.
6. **Revenue Engine** — per-partner take rates (TheFork 2€/cover, Booking 25–40% of hotel commission via affiliate, Viator 8%), avg basket sizes, attach rates, repeat-booking curve.
7. **Competitor Benchmark** — funding raised, users, revenue, monetisation, geo, gaps Travidz exploits. Sourced from Crunchbase, PitchBook public data, press.
8. **Market Trends & Tailwinds** — creator-economy travel ($250bn influence on bookings), Gen Z/Millennial share, short-form video → booking conversion stats, post-COVID experiential travel rebound.
9. **Sensitivity & Assumptions** — toggleable drivers (CAC, install→MAU, MAU→booker, avg commission) so investors can stress-test live.
10. **Sources & Evidence Log** — every figure tied to a numbered citation (publication, year, page/URL). This is the "back-up evidence" layer.

## Headline numbers I will derive (for sanity)
- **TAM** ≈ $1.1–1.4 trillion global online travel GBV → ~$60–80bn affiliate-commission opportunity.
- **SAM** ≈ $4–7bn — English-speaking discovery-driven bookings across restaurants, tours, hotels in covered cities.
- **SOM Yr 3 (Base)** ≈ £600k–£1.2M ARR from ~80–150k MAU, ~4–7% booker conversion, ~£90 avg commissionable basket.

Final numbers will be whatever the cited inputs produce — no fabrication.

## Build steps
1. Python script with `openpyxl` builds the 10 sheets, applies the colour conventions from the XLSX skill, embeds formulas (no hardcoded calcs), and writes the sources log.
2. Run `recalculate_formulas.py` to populate cached values and catch any #REF/#DIV errors.
3. QA: render each sheet to image, inspect every page for layout/overflow/typos. Fix and re-run until clean.
4. Deliver via `<presentation-artifact>` plus a short summary of headline TAM/SAM/SOM and the 5 most pitch-ready stats.

## Out of scope (call out for follow-up)
- Pitch deck slides themselves — produced next, fed by this workbook.
- SaaS financial model (`.xlsx`) — produced next, pulls SOM Yr1–3 GBV and commission lines directly.
- Primary research / customer interviews — desk research only in this pass.

Approve and I'll build the workbook in one go.
