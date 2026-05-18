## Goal

Replace the current short/generic copy in the v2 one-page elevator pitch (PDF + PPTX) with tighter, VC-grade wording. Keep the image-centric layout, Travidz palette, and Prove → Scale → Defend phasing. No layout changes unless required to fit text.

## Content rewrite (per panel)

**Problem** — name the gap, not the obvious.
- "Travel discovery has moved to creators; booking hasn't. £343B is transacted on OTAs that pay creators £0 and own the customer. Creators send the intent, OTAs keep the margin and the data."

**Solution** — what it is, why now, why us.
- "Travidz is a shoppable travel feed. Creator posts trip → traveller books in 2 taps → creator earns on every booking. Native checkout, unified inventory (stays · tours · experiences), attributed to the creator for life."
- One-line "why now": short-form video share of trip discovery + emerging creator-commerce rails (TikTok Shop, Instagram).

**Business model** — unit economics a VC can underwrite.
- Take rate 4–7% (blended Y5: 4.65%)
- Creator rev-share 30–50% of net
- Tiered creator subs + brand partnerships (secondary)
- Target contribution margin ~55% at scale; CAC paid back via creator-owned distribution (no paid acquisition in Y1–2)

**Traction** — proof of pull.
- Waitlist 3,200+ (organic, UK)
- 85 creator LOIs (aggregate ~4.2M followers)
- 12 supply partners signed (boutique stays + experiences, 3 cities)
- Closed pilot: [pilot metric placeholder — confirm]

**Team** — why this team wins.
- Replace generic "Founder One/Two/Three" with the real names + 1 credibility hook each. Will need user input — see Question 1.

**Growth plan (Prove → Scale → Defend)** — make each phase a gated milestone.
- PROVE  M0–18 · UK · 2.4k creators · £44M GBV · gate: ≥3% take, ≥40% creator M3 retention
- SCALE  M18–44 · EU-5 · 14k creators · £259M GBV · gate: CAC payback <6mo, ≥4% blended take
- DEFEND M44–60 · 24k creators · £444M GBV · moat: creator ledger + supply exclusivity + data flywheel

**Market (TAM/SAM/SOM)** — keep v8 numbers, add one-line "why credible".
- TAM £87.6B UK / £343B UK+EU-5 (ONS, Eurostat)
- SAM £23.2B / £82.9B (36% creator-influenced × 80% bookable; Phocuswright, GWI)
- Y5 SOM £444M GBV / £20.7M net rev @ 4.65% take (1.8% of UK SAM — sanity-checked vs. comparable creator-commerce ramps)

**The Ask** — sharpen.
- £2.5M SAFE · 18-mo runway · post → Series A at £18M GBV run-rate
- Use of funds: GTM 40% (creator acquisition + 2 EU launches) · Eng 35% (checkout, ledger, attribution) · Supply 15% · G&A 10%
- KPIs at next round: 8k active creators, £40M annualised GBV, 4% blended take

## Technical changes

- Edit `scripts/build_elevator_pitch_v2.py` — update string literals only; if any panel overflows, drop font 0.5pt or trim to fit (no layout restructure).
- Edit `scripts/build_elevator_pitch_v2_pptx.mjs` — mirror identical copy.
- Re-render both → QA each (markitdown for text, pdftoppm for visual). Fix any clipping. Save as `_v3` artifacts so v2 stays intact.

## Out of scope

In-app deck, additional pages, new charts, data-model changes.

## Questions before I write

1. Founder names + one credibility line each (or should I leave as "Founder · ex-Booking.com" style placeholders)?
2. Is there a real closed-pilot metric (GBV, bookings, take rate) I can quote, or keep Traction to waitlist/LOIs/supply only?
3. Any traction number you want to revise (waitlist 3,200+, 85 LOIs, 12 supply partners)?
