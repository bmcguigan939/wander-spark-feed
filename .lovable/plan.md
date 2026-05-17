## Goal

Add an internal, admin-only **financial model & investment** workspace inside Travidz that turns the v6 TAM/SAM/SOM and tapered commission model into an interactive 5-year forecast. Standalone — pure assumptions, no live DB reads. Lives at `/admin/investor` (admin-gated).

## Scope

Market sizing + revenue model only (per chosen scope). No P&L/cash, no cohort churn engine, no exports — those are explicitly out of scope for v1 and can be layered on later.

## 1. Route structure

New nested admin layout `src/routes/admin.investor.tsx` (sidebar + Outlet), with children:

- `admin.investor.index.tsx` — Overview: TAM → SAM → SOM funnel + headline 5-year GBV & net revenue chart
- `admin.investor.market.tsx` — Editable TAM/SAM/SOM assumptions (travellers, ABV, attach rate, market share %)
- `admin.investor.creators.tsx` — Creator funnel assumptions (signups/mo, GBV per active creator, % founding, % reaching power tier, tenure mix)
- `admin.investor.revenue.tsx` — Revenue & take-rate: per-year breakdown of GBV by tier (founding / power / new / maturing / mature), 8% gross, blended creator vs Travidz split, Travidz net revenue
- `admin.investor.scenarios.tsx` — Bear / Base / Bull preset toggles that swap the assumption set

All routes wrapped by an admin role guard (reuse the existing `requireAdmin` pattern already used by `admin.*` routes).

## 2. Model layer (pure, no DB)

`src/lib/investor-model/` — pure TypeScript, fully unit-testable, no Supabase:

- `assumptions.ts` — typed `Assumptions` object with v6 defaults seeded from the workbook (TAM travellers, SAM %, SOM %, ABV £, attach %, signups/mo curve, founding cap = 500, power threshold = £25k rolling-12mo GBV, tenure-tier mix by year, tapered split 50/40/30, gross commission 8%).
- `scenarios.ts` — three presets (`bear`, `base`, `bull`) that override a subset of `Assumptions`.
- `compute.ts` — pure functions:
  - `computeMarket(a)` → `{ tam, sam, som }` in £ GBV
  - `computeCreatorCohorts(a)` → for years 1–5: active creators, % founding / power / mature / maturing / new
  - `computeRevenue(a)` → for years 1–5: `{ gbv, grossCommission, creatorPayout, travidzNet, blendedTakeRate }`
- `format.ts` — money/percent formatters (reuse existing `src/lib/format.ts` if present).

State management: a single `useInvestorAssumptions` hook backed by `localStorage` (key `travidz.investor.assumptions.v1`) + a "Reset to v6 defaults" button. No DB persistence in v1 — fits the "standalone, internal only" choice.

## 3. UI

- Reuse existing dark-theme tokens (`bg-background`, `text-foreground`, primary `#3B82F6`) — no new design tokens.
- Charts: reuse `recharts` (already in deps) — stacked area for GBV-by-tier, line for blended take-rate glide path (4.0% → 6.2%), funnel/bar for TAM→SAM→SOM.
- Assumption inputs: shadcn `Input` + `Slider` for percentages, with live recompute (no save button needed since it's localStorage).
- Each page shows the resulting headline numbers in a sticky right-rail card so editing assumptions gives instant feedback.

## 4. Admin nav

Add an "Investor model" link to the admin sidebar in `src/routes/admin.tsx` (next to existing admin sections).

## 5. Out of scope (flag for later)

- P&L, costs, burn, runway
- Creator cohort churn / signup decay curves
- PDF / XLSX investor export
- Shareable read-only investor links
- Pulling live GBV from `deal_redemptions` (the existing v6 commission work already stamps the data — easy to wire later)

## 6. Sequencing

1. Create `src/lib/investor-model/` (assumptions, scenarios, compute, types) with v6 defaults.
2. Create `admin.investor.tsx` layout + admin guard + sidebar entry.
3. Build the four child routes (overview, market, creators, revenue) wired to the model.
4. Add scenarios route with bear/base/bull preset switcher.
5. Manual QA: defaults should reproduce the v6 workbook's headline year-5 GBV, Travidz net revenue, and blended take-rate.

## Technical notes

- All math lives in `src/lib/investor-model/` — zero React, zero Supabase — so we can later add a vitest spec without refactoring.
- No new dependencies; recharts and shadcn primitives already cover the UI needs.
- No migration, no server functions, no env vars.
