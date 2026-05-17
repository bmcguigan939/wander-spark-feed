## Build `Travidz_Market_Research_TAM_SOM_v6.xlsx`

Headline rev-share for v6: **Tapered 50 → 40 → 30 with a Power-Creator Tier.** Every creator starts at 50%, tapers down with tenure, but climbs back to 50% the moment they cross **£25k GBV in a rolling 12-month window.** Keeps cold-start velocity, rewards the power-law top 5%, expands platform margin as the long tail matures.

### 1. Cover sheet — new global inputs
- `New creator share (months 1–6)` = 50%
- `Maturing creator share (months 7–18)` = 40%
- `Mature creator share (months 19+)` = 30%
- `Power-creator threshold (rolling 12mo GBV, £)` = 25,000 (blue input — VC will test this)
- `Power-creator share` = 50%
- `Founding Creator cap (first N creators, 50% for life)` = 500

### 2. NEW — `Cohort Maturity` sheet
Models the blended creator share Y1–Y5 from three inputs:
- Monthly new-creator intake (from SOM Scenarios)
- Tenure mix per year (% of active creators in each band)
- Power-creator penetration (% of active creators above £25k threshold, ramping 2% Y1 → 12% Y5 based on LTK/Stay22 power-law benchmarks)

Output: **blended creator share** Y1 ~48%, Y2 ~44%, Y3 ~40%, Y4 ~36%, Y5 ~33%. Travidz net take-rate climbs **4.0% → 4.5% → 5.0% → 5.7% → 6.2%** of GBV.

### 3. SOM Scenarios — rewire
- Creator block: net commission = `GBV × 8% × (1 − Cohort Maturity!blended_creator_share)`
- Paid-UA block: unchanged at 50/50 (no tenure concept for paid bookings)
- Y3 / Y5 combined net commission recompute against the new blended share

### 4. `Scenarios — Rev-Share Tiers` — reshuffle
| Scenario | Structure | Y3 net | Y5 net | Raise |
|---|---|---|---|---|
| **A — Recommended** | Tapered + £25k power tier | ~£340k | ~£2.8M | ~£1.70M |
| B — Flat 50/50 | 50% forever | ~£280k | ~£2.0M | ~£1.90M |
| C — Pure tapered | 50→40→30 no power tier | ~£360k | ~£3.0M | ~£1.65M |

Scenario A becomes the default; B and C exist for VC Q&A.

### 5. Sensitivity sheet — one new lever
Add **Power-creator penetration %** as a third sensitivity axis alongside CPI and Conversion. Heat-map Y5 combined net commission across 5% / 10% / 15% / 20% penetration.

### 6. Revenue Engine + Exec Summary
- Update flywheel labels: *"50% on every booking from day one. Stay above £25k GBV/year and it's 50% forever."*
- New headline tile: *"Take-rate: 4% → 6.2% of GBV by Y5 as cohorts mature."*
- Callout: *"Top 10% of creators carry ~60% of GBV (LTK benchmark). The power tier ensures they never see a pay cut — alignment is permanent."*

### 7. Sources to add
- S32: LTK creator GBV distribution (power law, top-decile share)
- S33: Stay22 / Travelpayouts cohort retention curves

### Deliverable
`/mnt/documents/Travidz_Market_Research_TAM_SOM_v6.xlsx`, QA'd page-by-page, v5 retained for comparison. I'll flag headline numbers in the reply so you can sanity-check before we move to the pitch deck.

**Why this works for both sides:**
- **Creators:** Everyone starts at 50%. Anyone who's actually good (£25k GBV = ~£2k/mo income at 50% = a real side-income) stays at 50% forever. No one ever gets a pay cut while they're winning.
- **VCs:** Margin expands automatically as the platform matures (4% → 6.2%). The taper isn't a creator-hostile lever — it's a long-tail efficiency story. Power-law math means top creators (the 10% you actually care about retaining) are economically locked in.
