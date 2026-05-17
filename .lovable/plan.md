## Goal

Refresh the Travidz investor pitch with the brighter Travidz brand palette, keep the original v1 narrative intact, and weave in a **Prove → Scale → Defend** 3-phase growth plan. Ship as PPTX + PDF + interactive in-app deck.

## Palette (all three formats)

Aligned with project core memory — bright, Apple-like, electric blue on deep slate.

| Token | Hex | Use |
|---|---|---|
| `bg-deep` | `#0F172A` | Slide backgrounds (title + closer) |
| `bg-light` | `#F8FAFC` | Slide backgrounds (content) |
| `primary` | `#3B82F6` | Headlines, accent bars, phase highlights |
| `primary-glow` | `#60A5FA` | Gradients, hover/active states |
| `ink` | `#0F172A` | Body text on light |
| `paper` | `#F8FAFC` | Body text on dark |
| `muted` | `#64748B` | Captions, sources |
| `success` | `#22D3EE` | Positive metrics, gates met |

Typography: SF Pro Display (headings) / Inter (body) — matches project core.

Replaces v1's flatter Midnight Indigo navy. Brighter, more confident, consistent across PPTX + PDF + app.

## Original v1 narrative — preserved

All 15 v1 slides keep their headlines, body copy, and visual structure. Only changes:
- Recolour to Travidz palette above
- Refresh numbers to v8 / financial model (TAM £87.6B UK / £343B UK+EU-5; SAM £23.2B / £82.9B; Y5 SOM £444M GBV / £20.7M net / 4.65% take; sources → ONS, VisitBritain, Eurostat, Phocuswright, GWI, Skift)
- Update 18-month milestones on Ask slide to match Phase 1 gates

## 3-phase plan — woven in (not bolted on)

**New slide (inserted after Slide 11 — Go-to-Market):**

**Slide 12 — Growth plan: Prove → Scale → Defend**

Horizontal 3-column timeline. Each column is a phase card on dark gradient with primary-blue accent bar.

| Phase | Window · Raise | Headline | KPI gates (exit criteria) | Use of funds |
|---|---|---|---|---|
| **1 · Prove** | M0–18 · Seed £2M | UK-only. Founding-500 lock-in. Prove unit economics. | 2,400 creators · £44M GBV · 4.12% take · 100 power-tier locks · 250 operators | 40% creator GTM · 35% eng · 15% supply · 10% G&A |
| **2 · Scale** | M18–44 · Series A £8M | EU-5 rollout (FR/DE/ES/IT/NL). Paid-UA flywheel. Double engineering. | 14,000 creators · £259M GBV · 4.72% take · £12M ARR | EU expansion · ranking/personalisation · ops scale |
| **3 · Defend** | M44–60+ · Series B £20M | Platform moat. Supply-side network effects. US entry options. | 24,000 creators · £444M GBV · 4.65% blended · category default | US entry · partnerships · trust/safety · data moat |

**Cross-references in existing slides (light touch, no rewrites):**
- Slide 11 (GTM): add phase chip ("Phase 1 · Prove") to the founding-500 column; ("Phase 2 · Scale") to power-tier; ("Phase 3 · Defend") to operator pull
- Slide 14 (Ask): retitle "18-MONTH MILESTONES" → "PHASE 1 · PROVE — 18-month gates" and align bullets to Phase 1 exit criteria

Final deck length: **16 slides** (was 15).

## Three deliverables

### 1. PPTX — `Travidz_Investor_Deck_Seed_v2.pptx`
- Rebuild via `pptxgenjs` reusing v1 layout/content
- Apply Travidz palette globally
- New Phase slide: 3 cards, primary-blue top borders, phase number large in `primary-glow`, dark gradient bg
- Save to `/mnt/documents/`

### 2. PDF — `Travidz_Investor_Deck_Seed_v2.pdf`
- LibreOffice headless conversion from PPTX
- Visual QA: render each slide → JPG → inspect for overflow/contrast/overlap → fix → re-render until clean

### 3. In-app interactive deck — `/investor/deck`
- TanStack route `src/routes/investor.deck.tsx`
- Follow `slides-app` knowledge: fixed 1920×1080 slides + scale transform, scoped font scaling, dark backdrop
- 16 React slide components in `src/components/investor-deck/slides/`
- Shell: keyboard nav (← → Space Esc), F for fullscreen, G for thumbnail grid, slide counter
- Public route, `noindex` meta — founder can share link
- "Open pitch deck" link added to `/admin/investor` header
- Reuses palette via CSS variables in `src/styles.css` (extends existing tokens, no breaking changes)

## Sequencing
1. Build PPTX (all 16 slides, new palette, phase slide) → render → QA → fix → re-render until clean
2. Convert clean PPTX → PDF
3. Build in-app deck (route + 16 slides + shell) — mirrors PPTX
4. Cross-check numbers across all three formats match v8 + financial model

## Out of scope
- Rewriting v1 headlines or restructuring slide order
- Editing v8 workbook or financial model
- Founder placeholders (team names, live traction) — left as `[ ... ]`
- Changes to `src/lib/investor-model/` assumptions

No new dependencies, migrations, or server functions.