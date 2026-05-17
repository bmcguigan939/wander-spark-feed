# Travidz Financial Model v1 — UK build, 60 months, Buildstreams-style

Produce a full **60-month (5-year)** Excel model in the same shape as the attached Buildstreams v4 reference: Summary Dashboard, Assumptions (only blue-input sheet), Channel CAC, UK headcount, monthly creator-cohort + operator tabs, and a consolidated P&L + Cash sheet — all formula-driven.

**Deliverable:** `/mnt/documents/Travidz_Financial_Model_v1.xlsx` + a PDF preview. Built with the xlsx skill: blue = inputs, black = formulas, green = cross-sheet refs, currency `£#,##0;(£#,##0);-`, percentages 0.0%, years as text. LibreOffice recalc + zero-error audit before delivery.

## Workbook structure (7 sheets, all 60-month horizon M1–M60)

### 1. `summary_dashboard`
Top-of-file KPI page.
- **Scenario selector:** Base / Bear / Bull (drives a `Lookup` block; everything else uses `INDEX/MATCH` against it)
- **KPIs at M12 / M24 / M36 / M48 / M60:** Active creators, Active operators, Annual GBV, Gross commission, Creator payouts, Travidz net revenue, Blended take-rate, Gross margin, EBITDA, Peak cash requirement, Month of peak burn, Months to EBITDA breakeven, Runway months at first raise, Required seed (computed as `−min(net cash)` + 6mo buffer), Year-5 ARR-equivalent (Travidz net × 12 at M60)
- **Scenario comparison table:** Base / Bear / Bull side-by-side at Y1/Y3/Y5
- **Charts:** GBV by month (line), Net cash balance (line with seed + Series A injection steps), Headcount ramp (stacked area by team), EBITDA bridge Y1→Y5

### 2. `assumptions` (only blue-input sheet)
Three scenario columns: Base / Bear / Bull. Notes column.

**Market & commission** (mirrors `src/lib/investor-model/assumptions.ts` v6 Base)
- TAM travellers 85M, ABV £480, bookings/traveller 1.6, SAM% 28%, SOM share Y1–Y5 (extrapolated flat at Y5 level for Y6–Y5 isn't needed; horizon ends at Y5 = M60)
- Gross commission 8%, creator tapered share 50/50/50/40/30, founding cap 500, power threshold £25k rolling-12mo

**Creator funnel** (drives monthly cohort, 60 months)
- Starting active creators, month paid acquisition starts, monthly paid intake by tier, organic %, monthly creator churn %, GBV per active creator (ramped at M1 / M12 / M24 / M36 / M48 / M60 with linear interp)

**Operator funnel**
- Starting partners, monthly new partners, churn, attribution % of GBV touching a verified partner

**Unit costs**
- Payment processing % of GBV (Stripe 1.5% + £0.20 per booking)
- Cloud infra £/active creator/mo, video CDN £/1k plays, AI/Lovable Cloud £/mo (ramped across 5 bands)
- Creator support £/active creator/mo

**UK payroll on-costs (global)**
- Employer NIC 13.8%, Pension 3%, Apprenticeship Levy 0.5% (auto-on once paybill > £3M, modelled as toggle from M24), Benefits £3,600/FTE/yr, Recruitment 15% of base (one-off in hire month), Annual salary inflation 4%

**Non-payroll opex** (monthly £, ramped across **5 bands**: M1–6, M7–12, M13–24, M25–36, M37–60)
- Co-working/office (M37+ assumes small London HQ), Legal, Accounting/R&D tax, Insurance, SaaS tooling, Performance marketing, Travel/events, Contingency %

**Funding** (multi-tranche over 60 months)
- Starting cash, Seed £2.0M at M0, Series A (default £8.0M at M22), Series B placeholder (default £20.0M at M44, toggleable)

### 3. `channel_cac`
Creator acquisition CAC (replaces Buildstreams' customer CAC). Two blocks: **Creator CAC** + **Operator CAC**. Channels: Paid Social (TikTok/IG), Creator Referral, Founding-500 Programme, SEO/Content, Events, Direct outreach. Columns: Spend £/mo, Conv %, CAC, New/mo, Totals.

### 4. `headcount_uk`
UK hiring roster — one row per planned hire, columns M0…M60. Inputs: Role, Team, Base salary £, Start month, End month (optional). Computed per month: gross, NIC, pension, benefits, recruitment (one-off in start month), loaded cost. Salary inflation applied annually. Totals by team and month feed `combined_pnl_cash`.

Default Base-case roster (~18 FTE by M18, ~30 by M36, ~42 by M60):

| Start | Role | Team | Base £ |
|---|---|---|---|
| M0 | CEO / Founder | exec | 85,000 |
| M0 | CTO / Co-founder | exec | 85,000 |
| M0 | Founding engineer | eng | 80,000 |
| M0 | Head of Creator Growth | growth | 75,000 |
| M2 | Senior full-stack eng | eng | 90,000 |
| M2 | Product designer | design | 75,000 |
| M4 | Senior mobile eng (RN) | eng | 95,000 |
| M4 | Creator partnerships mgr | growth | 55,000 |
| M6 | Head of Operator Supply | supply | 80,000 |
| M6 | Data/ML engineer | eng | 90,000 |
| M9 | Backend engineer | eng | 80,000 |
| M9 | Growth marketer | growth | 60,000 |
| M9 | Ops/finance lead | ga | 65,000 |
| M12 | Senior engineer #2 | eng | 90,000 |
| M12 | Creator partnerships #2 | growth | 55,000 |
| M12 | Customer support lead | ops | 40,000 |
| M15 | Senior product manager | product | 85,000 |
| M15 | Compliance/legal ops | ga | 60,000 |
| M20 | Senior eng #3 | eng | 95,000 |
| M22 | Designer #2 | design | 75,000 |
| M24 | Head of Marketing | growth | 95,000 |
| M26 | Engineering manager | eng | 110,000 |
| M28 | Data analyst | eng | 65,000 |
| M30 | Operator partnerships mgr | supply | 65,000 |
| M32 | Finance manager | ga | 70,000 |
| M34 | Senior backend eng #4 | eng | 90,000 |
| M36 | International expansion lead | growth | 90,000 |
| M38 | Senior designer #3 | design | 85,000 |
| M40 | ML/recommendations eng | eng | 105,000 |
| M42 | VP Engineering | exec | 140,000 |
| M44 | Head of Finance | exec | 120,000 |
| M46 | Senior PM #2 | product | 90,000 |
| M48 | Creator success #3 | growth | 55,000 |
| M50 | Senior eng #5 | eng | 95,000 |
| M52 | People & Talent lead | ga | 75,000 |
| M54 | Senior eng #6 | eng | 95,000 |
| M56 | Trust & Safety lead | ops | 70,000 |
| M58 | Senior PM #3 | product | 90,000 |
| M60 | Head of International | exec | 110,000 |

### 5. `creator_cohorts` (monthly, 60 columns)
Per month: New paid creators, New organic, Churned, Active creators EOM, Active-by-tier (Founding / Power / New / Maturing / Mature with tier transitions via tenure month + £25k power threshold), GBV/active creator (ramped), Monthly GBV, Gross commission (8%), Blended creator payout (tier mix × creator share table), Travidz net revenue, Take-rate %.

### 6. `operator_supply` (monthly, 60 columns)
New partners, churn, total active, attribution-weighted GBV share, partner-success cost per active partner.

### 7. `combined_pnl_cash` (monthly, 60 columns)
- Revenue = `creator_cohorts!Travidz net`
- COGS = payment processing + hosting + video CDN + AI usage + creator support
- Gross profit / Gross margin %
- OpEx = payroll loaded (`headcount_uk`) + non-payroll lines (`assumptions`) + channel spend (`channel_cac`)
- EBITDA, Cumulative EBITDA, EBITDA margin
- **Cash:** Opening cash + revenue − total cash costs + raise tranches = Closing cash
- Peak cash deficit (running min)
- Runway (months until closing cash ≤ 0 absent next raise)

## Build & QA process

1. Copy `recalculate_formulas.py` and `run_libreoffice.py` from the xlsx/pdf skills
2. Generate workbook with openpyxl — **all** formulas, no hardcoded computed values; assumption cells in blue, formulas in black, cross-sheet refs in green
3. Run `recalculate_formulas.py` → assert `total_errors: 0`
4. Convert to PDF, then `pdftoppm` to JPGs, **inspect every page** for layout breakage, column widths, number formats, chart legibility, no `#REF!`/`#DIV/0!`
5. Iterate until clean
6. Drop into `/mnt/documents/Travidz_Financial_Model_v1.xlsx` (+ `.pdf`)
7. Summarise the QA pass (issues found + fixed)

## Cross-checks against existing v6 model

Excel `assumptions` hardcodes the same v6 Base values used by `src/lib/investor-model/assumptions.ts`, so Y5 (M60) outputs must reconcile:
- Active creators ≈ 24,000
- Annual GBV ≈ £444M
- Travidz net revenue ≈ £20.7M
- Blended take-rate ≈ 4.65%

Drift between Excel output and the TS model = bug, fix before delivery.

## Out of scope (deferred)

- Wiring opex back into the in-app `/admin/investor` tab (next step after Excel is locked)
- Rebuilding the pitch deck (next step after opex + cash plan are locked)
- Working capital / VAT / EMI option valuations
- Multi-currency (model is GBP only)

## Sequencing

1. Build the 60-month workbook (this step)
2. You review in Excel — adjust hires, salaries, channel spend, raise sizing/timing to taste
3. I sync the locked numbers back into `src/lib/investor-model/` and rebuild the pitch deck against the defensible burn/runway/Series A story
