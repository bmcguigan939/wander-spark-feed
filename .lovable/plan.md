## Travidz · One-Page VC Elevator Pitch (Landscape PDF)

A single A4 landscape page (297×210mm) designed to be skim-read in 60 seconds by a VC partner. Travidz brand palette (deep slate `#0F172A`, electric blue `#3B82F6`, cyan accent `#22D3EE`, paper `#F8FAFC`). SF Pro Display / Inter typography. Built with ReportLab → PDF, plus a matching PPTX export for re-use.

### Layout (landscape, 12-column grid)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ TRAVIDZ  │  Creator-led travel commerce  │  Seed · £2.5M · 18-mo runway     │  ← top bar
├──────────────────────┬───────────────────────────────────────────────────────┤
│                      │  PROBLEM                                              │
│                      │  £343B booked blind. Creators drive intent,           │
│   CENTRAL HERO       │  earn nothing on the booking.                         │
│   IMAGE              │                                                       │
│   (phone mockup of   │  SOLUTION                                             │
│    Travidz feed +    │  Shoppable travel feed. Creator → booking → payout.   │
│    booking, on a     │                                                       │
│    brand-gradient    │  WHY NOW · TAM/SAM/SOM strip                          │
│    backdrop)         │  TAM £87.6B UK / £343B UK+EU-5                        │
│                      │  SAM £23.2B / £82.9B                                  │
│                      │  Y5 SOM £444M GBV · £20.7M net · 4.65% take          │
├──────────────────────┴───────────────────────────────────────────────────────┤
│  TRACTION   │   BUSINESS MODEL   │   GROWTH PLAN: Prove → Scale → Defend     │
│   3 KPIs    │   Take-rate + tiers│   3 phase chips with gates                │
├─────────────────────────────────────────────────────────────────────────────┤
│  TEAM (3 founders, 1-line each)   │   THE ASK  £2.5M · 40 GTM / 35 Eng / …   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Content blocks (final copy, locked to v8 model)

1. **Header bar** — Logo · tagline · round/size/runway.
2. **Hero image** (left third) — phone mockup of the Travidz feed + booking sheet on the brand gradient. Generated via `imagegen` at 1024×1536 portrait, transparent background, dropped onto a deep-slate panel with a cyan glow.
3. **Problem** — 2 lines.
4. **Solution** — 2 lines + 3-icon row (Discover · Book · Earn).
5. **Market strip** — TAM/SAM/SOM as 3 stacked numbers with source chips (ONS, VisitBritain, Eurostat, Phocuswright).
6. **Traction** — 3 KPI tiles (waitlist, creator LOIs, supply partners) — placeholders flagged for founder fill-in.
7. **Business model** — take-rate ladder 4.12% → 4.72% → 4.65%; revenue mix bar.
8. **Growth plan** — Prove (M0-18, UK, 2.4k creators, £44M GBV) · Scale (M18-44, EU-5, 14k, £259M) · Defend (M44-60+, platform moat, 24k, £444M). Three chips, one line of exit gates each.
9. **Team** — 3 founder one-liners (placeholder names retained from v1).
10. **The Ask** — £2.5M SAFE · use of funds donut (40/35/15/10) · 18-month gates · contact line.

### Files & process

- `scripts/build_elevator_pitch_v1.py` — ReportLab landscape A4, embedded fonts (Inter/SF fallback to Helvetica), embeds hero JPG as base64.
- `src/assets/elevator_hero.png` — generated phone mockup (premium imagegen, transparent bg, composited onto gradient panel inside the PDF).
- Output: `/mnt/documents/Travidz_Elevator_Pitch_v1.pdf` (+ matching `.pptx` via pptxgenjs single-slide 13.33×7.5").
- QA: render to JPG at 200dpi, inspect for overlap/clipping/contrast, fix, re-render. Report findings.

### Out of scope

- In-app interactive deck (deferred per user).
- Editing v8 workbook or financial assumptions.
- Multi-page or portrait variants.
- Founder bios beyond v1 placeholders.

### Deliverables

1. `Travidz_Elevator_Pitch_v1.pdf` (landscape, single page)
2. `Travidz_Elevator_Pitch_v1.pptx` (matching single slide)
3. Short QA summary listing issues found and fixes applied.

Approve and I'll generate the hero image, build both files, and run visual QA before handing them over.
