## Goal

Today the model reports `travidzNet` as the bottom line, but it is **gross margin before infrastructure COGS**. At Y3+ scale, Mux video infra alone is material (~£60k Y3 → £300k–£500k Y5). Add a COGS layer so the headline number investors see is a real **contribution margin**, not a pre-infra figure.

## Changes

### 1. `src/lib/investor-model/assumptions.ts` — add COGS inputs

Add a new block to `Assumptions`:

```ts
// Infrastructure COGS (per-year, GBP)
infraCosts: {
  // Mux — encoding (one-off per upload) + storage (per-min/mo) + streaming (per-min played)
  muxEncodePerMin: number;        // £0.032 (~$0.04)
  muxStoragePerMinMonth: number;  // £0.0024 (~$0.003)
  muxStreamPerMin: number;        // £0.00077 (~$0.00096)
  avgVideoLengthMin: number;      // 1.0 (60s shortform)
  videosPerActiveCreatorPerYr: number; // 20
  viewsPerVideoPerYr: number;     // grows with audience; ramp by year
  viewsPerVideoByYear: number[];  // [50, 150, 400, 900, 1800]
  // Lovable Cloud (Postgres + Auth + Storage) — tiered by active creators/MAU
  lovableCloudByYear: number[];   // [300, 1_200, 6_000, 24_000, 60_000] £/yr
  // Email (Resend / SES) — flat per-year estimate
  emailByYear: number[];          // [120, 600, 2_400, 7_200, 18_000] £/yr
};
```

Populate `V6_DEFAULTS.infraCosts` with the values above (conservative, USD→GBP at 0.80).

### 2. `src/lib/investor-model/compute.ts` — compute & expose COGS

Extend `RevenueYear`:

```ts
muxEncodeCost: number;
muxStorageCost: number;
muxStreamCost: number;
muxTotal: number;
lovableCloudCost: number;
emailCost: number;
infraTotal: number;
contributionMargin: number;      // travidzNet − infraTotal
contributionMarginPct: number;   // of GBV
```

In `computeRevenue(a)` per year `i`:

```
videoCount       = activeCreators[i] * videosPerActiveCreatorPerYr
totalMinutes     = videoCount * avgVideoLengthMin
encode           = totalMinutes * muxEncodePerMin
storage          = totalMinutes * muxStoragePerMinMonth * 12   // assume avg 12mo retention
streamMinutes    = videoCount * viewsPerVideoByYear[i] * avgVideoLengthMin
stream           = streamMinutes * muxStreamPerMin
muxTotal         = encode + storage + stream
infraTotal       = muxTotal + lovableCloudByYear[i] + emailByYear[i]
contributionMargin    = travidzNet - infraTotal
contributionMarginPct = contributionMargin / gbv
```

### 3. `src/routes/admin.investor.tsx` — show COGS in the model

- Add new rows to the year-by-year table under "Travidz net":
  - Mux total
  - Lovable Cloud
  - Email
  - **Infra total** (subtotal)
  - **Contribution margin** (bold)
  - Contribution margin % of GBV
- Add a `HeadlineStrip` stat: "Y5 contribution margin" alongside the existing "Y5 Travidz net".
- Add the same rows to the per-year `KV` card.
- Add the new series ("Infra costs", "Contribution margin") to the existing revenue chart payload.

### 4. `src/routes/invest.tsx` — public investor narrative

- Replace the "Travidz net @ 4.68%" headline with a two-line stat:
  - "Travidz net (gross) — £16.3M" *(small, muted)*
  - "Contribution margin (after infra) — £{computed}M" *(bold, primary)*
- Add a short "Infrastructure & unit economics" section explaining the stack:
  > Travidz runs on Cloudflare edge + Lovable Cloud (Postgres/Auth/Storage) + Mux for video. Video is the dominant variable cost: ~£0.032/min encoded, ~£0.00077/min streamed. Y5 infra is modelled at ~£{X}M against £350M GBV, leaving ~{Y}% contribution margin.
- Update the UK Base / Global Viral comparison table to add a "Contribution margin (Y5)" row.

### 5. Out of scope

- No changes to commission logic, Stripe handling, or tier splits.
- No new database tables — COGS lives in the in-memory assumptions model.
- Salaries/G&A/marketing are still excluded (these are operating costs below contribution margin, handled separately in the funding ask).

## Default values (sources)

| Input | Default | Source |
|---|---|---|
| Mux encode | £0.032/min | Mux pricing $0.04/min → 0.80 FX |
| Mux storage | £0.0024/min/mo | Mux $0.003/min/mo |
| Mux streaming | £0.00077/min | Mux $0.00096/min |
| Avg video length | 1.0 min | Shortform UGC |
| Videos / creator / yr | 20 | Conservative active-creator output |
| Views/video by year | 50 / 150 / 400 / 900 / 1800 | Audience ramp w/ MAU |
| Lovable Cloud £/yr | 300 / 1.2k / 6k / 24k / 60k | Tier upgrades w/ MAU |
| Email £/yr | 120 / 600 / 2.4k / 7.2k / 18k | Resend volume tiers |

All sliders editable in `/admin/investor` via the existing `useAssumptions` flow (the new `infraCosts` block just becomes another editable group).
