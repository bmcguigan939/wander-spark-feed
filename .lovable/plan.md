## Goal

Build an **in-app investor pitch experience** at a shareable URL (`/invest`) that lets a VC live-experience Travidz while reading the pitch. One scrollable page, mobile-friendly, fully public (no login), with deep links to the real product so the investor can tap into the actual feed, map, creator profile, and earnings calculator — then return to the pitch.

## URL & sharing

- Route: `src/routes/invest.tsx` → `https://wander-spark-feed.lovable.app/invest`
- Optional tracking param: `/invest?ref=<vc-name>` (e.g. `/invest?ref=sequoia`). Logged client-side via existing analytics fn; no PII.
- Full SEO `head()`: title, description, og:image (reuse hero from v3 PDF), twitter:card. Public route, no auth gate.
- "Copy link" + "Download deck (PDF / PPTX)" buttons at top-right linking to the existing `/mnt/documents/Travidz_Elevator_Pitch_v3.{pdf,pptx}` artifacts (uploaded as static assets in `public/decks/`).

## Page structure (single scroll, snap sections)

1. **Hero** — Brand-gradient cover, tagline "Discover · Book · Earn", one-line thesis, CTAs: ▶ Try the product · ⬇ Download deck · 🔗 Copy link.
2. **Live product preview** — Embedded phone-frame iframe of `/` (For You feed) so the VC sees real videos playing. "Open full app ↗" button → opens `/` in new tab. Fallback: static screenshot if iframe blocked.
3. **Problem / Solution** — Two-column, same copy as v3 deck.
4. **How it works** — 3-step animated diagram (Creator posts → Traveller books → Creator earns) with deep links: "See a creator" → `/u/<seed-username>`, "See a deal" → `/deals`, "See the map" → `/map`.
5. **Business model** — Take-rate, rev-share, contribution margin cards. Mini interactive: slider for GBV → shows Travidz net @ 4.65% (reuses logic from `src/lib/investor-model/compute.ts`).
6. **Traction** — KPI tiles (waitlist, LOIs, supply partners) pulled live from a new public read-only server fn `getInvestorTraction` (or static if numbers are fixed).
7. **Market (TAM/SAM/SOM)** — Reuse `computeMarket` from `investor-model`. Render same v8 numbers as deck. Stacked bar chart (Recharts already in deps).
8. **Growth plan** — Prove → Scale → Defend timeline cards with gate metrics.
9. **Team** — Photos + one-line credibility hooks (copy from v3).
10. **The Ask** — £2.5M SAFE, 18-mo runway, use-of-funds horizontal bar, KPIs at next round.
11. **Footer CTA** — "Let's talk" → mailto + Calendly placeholder; "Explore the live app" → `/`.

## Technical

- New file: `src/routes/invest.tsx` (single component, no auth).
- New file: `src/components/invest/` — small subcomponents (`InvestHero`, `LiveProductFrame`, `RevenueSlider`, `MarketChart`, `AskBar`).
- Reuse: `V6_DEFAULTS`, `computeMarket`, `computeRevenue`, `fmtGBP`, `fmtPct` from `src/lib/investor-model/`.
- Copy `Travidz_Elevator_Pitch_v3.pdf` and `.pptx` to `public/decks/` so they're served at `/decks/Travidz_Elevator_Pitch_v3.pdf`.
- Add `/invest` to `src/routes/sitemap[.]xml.ts` so it's indexable (or `noindex` if you'd rather keep it unlisted — see Question 2).
- Mobile-first, dark theme matches existing Travidz palette (`src/styles.css` tokens). Snap-scroll with Tailwind `snap-y snap-mandatory` on desktop; normal scroll on mobile.
- No new DB tables. No new secrets. No auth changes.

## Out of scope

- Per-VC unique links with access tracking (could be a v2 — would need a `pitch_views` table).
- Editable pitch CMS.
- New chart data — all numbers locked to v8 model already in code.

## Questions

1. **Live product embed** — embed the real `/` feed in an iframe (most impressive but feed may be empty for unauth users), or use a 30-second looping screen recording? I'd default to iframe with screen-recording fallback.
2. **Discoverability** — list `/invest` in sitemap.xml and let Google index it, or keep it unlisted (noindex, share-only)? I'd default to **noindex** since it's a sales asset.
3. **Calendly / meeting link** — what email or scheduling link should the "Let's talk" CTA use? (Falls back to `mailto:` placeholder if none.)
