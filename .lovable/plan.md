## Goal

Ship a Travidz **Seed-stage investor pitch deck**, positioning Travidz as "the next TikTok/Instagram, but the booking layer wins the holiday." Anchored on the v6 Base-case SOM/TAM. Delivered in two forms:

1. **Downloadable artifact** — `Travidz_Investor_Deck_Seed_v1.pptx` + auto-converted `.pdf` saved to `/mnt/documents/`.
2. **In-app slide route** — `/admin/investor/deck` (admin-gated, fixed 1920×1080 scaled canvas, keyboard nav, fullscreen present mode).

Both pull numbers from the existing `src/lib/investor-model/` (V6_DEFAULTS base case) so the deck and the live model never drift.

## Narrative arc (15 slides)

Tuned for FOMO without crossing into hype — every claim either ties to a cited external stat or to the v6 model output.

1. **Title** — "Travidz. The feed that books the holiday." Founder, raise size, contact.
2. **The boat is leaving** — Social commerce hit $1.2T global GMV in 2025; travel is the last vertical without a native social-commerce winner. (Citations baked in.)
3. **Problem** — Travel discovery happens on TikTok/Instagram; booking happens 3 clicks and 3 tabs later on Booking.com. The handoff leaks 80%+ of intent.
4. **Solution** — Short-form video feed → tap → book the exact deal in-app. One surface for inspiration *and* transaction.
5. **Why now** — Gen Z + Millennials = 60% of travel spend by 2030; 70% already start travel research on social; creator-led commerce growing 35% YoY.
6. **Product** — 3 screenshots/mocks: feed, deal card, in-app checkout. "TikTok UX, Booking.com economics."
7. **Market — TAM/SAM/SOM** — pulled from v6: TAM ~£65B GBV (85M travellers × 1.6 bookings × £480), SAM 28%, Y5 SOM share.
8. **Business model** — Flat 8% commission to businesses. Creators earn tapered 50→40→30 share; Travidz net glides 4% → 6.2% as cohort matures.
9. **Traction** — placeholder block for current creators, GBV, partner businesses, geos — clearly marked "[update before send]" so founder fills the live numbers.
10. **Unit economics** — Year 5 base case: ~24k active creators, £X GBV, £Y Travidz net, blended take-rate 6.2%. Power-creator tier locks the supply side.
11. **Go-to-market** — Founding-Creator programme (first 500 locked at 50%/life) → viral creator referral → demand-side flywheel. CAC payback < 6 months at base.
12. **Competition** — 2×2 matrix: x = social-native, y = bookable inventory. Booking.com / Expedia / TikTok / Instagram / Airbnb plotted; Travidz alone in top-right.
13. **Team** — founder + key hires + advisors (placeholder rows).
14. **The ask** — Seed £[X]M for 18-month runway → hit Y2 milestones (creators, GBV, blended take-rate). Use of funds pie.
15. **Closing** — "Every category had its TikTok moment. Travel's is now." + contact.

## Artifact build (.pptx)

- `scripts/build-pitch-deck.mjs` — Node script using `pptxgenjs` (per skill/pptx). Reads V6_DEFAULTS + computeRevenue/computeMarket from the existing model (via a small TS-to-JS shim or by mirroring the numbers — easiest: have the script import the model and call the same pure functions; use `tsx` for execution).
- Palette: Travidz dark theme — `#0F172A` background, `#3B82F6` primary, `#22D3EE` accent, off-white text. Header font: a confident sans (Calibri/Arial Black fallback for PPTX portability). Body: Calibri.
- Every numeric slide pulls live from `computeMarket(V6_DEFAULTS)` / `computeRevenue(V6_DEFAULTS)` so re-running the script reflects any model update.
- Citations rendered as small footer text on each "claim" slide.
- After build: convert to PDF via LibreOffice, render JPGs, **mandatory visual QA pass** (no overflow, contrast, alignment, no leftover placeholders).
- Outputs: `/mnt/documents/Travidz_Investor_Deck_Seed_v1.pptx` + `.pdf`, surfaced via `<presentation-artifact>` tags.

## In-app slide route

Per the `slides-app` skill:

- New route `src/routes/admin.investor.deck.tsx` (nested under existing admin-gated `/admin/investor` layout work already in plan; reuses `AdminLayout`'s admin guard so no new auth).
- `src/components/deck/` — `ScaledSlide.tsx` (1920×1080 fixed canvas, `transform: scale(...)` to fit container), `DeckShell.tsx` (toolbar + arrow/space/Esc keys, fullscreen API), `slides/` one .tsx per slide (15 files, ~30 lines each).
- Each numeric slide imports from `@/lib/investor-model` so it stays in lock-step with the model tab.
- Scoped `.slide-content` font scaling block added to `src/styles.css`.
- "Download .pptx" button at top of `/admin/investor/deck` links to the artifact in `/mnt/documents/`.

## Citations (researched up-front, hardcoded into slides)

Will run 3–4 `websearch--web_search` calls before slide content lands, to verify:
- Social commerce 2025 GMV figure
- Gen Z/Millennial travel spend share by 2030
- % of travellers using social for trip research
- Creator economy / creator commerce YoY growth

Each citation displayed as inline footer source attribution on the slide it backs.

## Out of scope (flag for later)

- Scenario toggle (Bear/Bull) inside the in-app deck — Base only for v1
- Live "current traction" auto-pulled from Supabase — placeholder slide instead
- Custom-domain hosting of the deck for share links
- Animated transitions beyond a simple fade

## Sequencing

1. Run citation web searches; lock the 4–5 external stats.
2. Build `scripts/build-pitch-deck.mjs`, run it, QA the PDF visually slide-by-slide, fix, re-render until clean.
3. Drop the .pptx + .pdf into `/mnt/documents/` and emit `<presentation-artifact>` tags.
4. Build `src/components/deck/` primitives + 15 slide components.
5. Add `/admin/investor/deck` route + Present-mode + download button.
6. Add nav entry under the Investor model tab strip.

## Technical notes

- Numbers single-source-of-truth = `src/lib/investor-model/`. Both the .pptx script and the React slides import from there.
- No new npm deps for the in-app deck (Tailwind + existing primitives).
- `pptxgenjs` and `tsx` installed in the sandbox just for the build script — not added to the app's runtime deps.
- Admin-only: the in-app deck inherits `AdminLayout`'s `isAdmin` guard. No new RLS / migrations.
