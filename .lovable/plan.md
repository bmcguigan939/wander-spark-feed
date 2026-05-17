## Update creator-led commission economics in v3 workbook

Currently the creator-led block in `Travidz_Market_Research_TAM_SOM_v3.xlsx` uses the same affiliate take-rate as the paid-UA channel (≈10–12%) and gives creators a 20% rev-share of Travidz's net commission. That does not match how these deals are actually structured.

### New commission rule (creator-onboarded businesses only)
- **Total commission charged to the business: 8% of GBV**
- **Travidz net take: 4% of GBV**
- **Creator share: 4% of GBV** (paid directly out of the 8%, not a rev-share of Travidz's cut)

Paid-UA / affiliate-sourced bookings are unchanged — they keep the existing TheFork-style per-cover / affiliate take-rate.

### Changes to the workbook (produces `Travidz_Market_Research_TAM_SOM_v4.xlsx`)

1. **Cover / FX & Assumptions sheet**
   - Add two new global inputs (blue, yellow highlight):
     - `Creator deal — Total commission %` = 8.0%
     - `Creator deal — Travidz share %` = 4.0%
   - Derived (black): `Creator share %` = Total − Travidz = 4.0%.

2. **SOM Scenarios sheet — Creator-Led block (rows ~61–122)**
   - Replace the current "creator commission = GBV × affiliate_take_rate" and "creator rev-share = 20% × commission" lines with:
     - `Creator GBV` (unchanged formula)
     - `Gross commission (8%)` = Creator GBV × Cover!`Creator total %`
     - `Travidz net commission (4%)` = Creator GBV × Cover!`Travidz share %`
     - `Creator payout (4%)` = Gross − Travidz net
   - Update the Conservative / Base / Stretch columns so all three scenarios reference the same 8% / 4% / 4% inputs (scenarios still vary on volume drivers, not on take-rate).
   - Update the "Total commission" roll-up at the bottom of SOM to sum: `Paid-UA net commission + Creator Travidz net commission (4%)`. Remove the old 20% rev-share opex line — it's no longer needed because the creator payout is already netted out at the take-rate level.

3. **Revenue Engine sheet**
   - Update the two-sided flywheel table: creator-onboarded supply now carries an explicit `8% gross / 4% Travidz / 4% creator` label and the blended take-rate row recalculates from the new mix.

4. **Raise & Runway sheet**
   - Recalculate required raise using the new (lower) Travidz net commission from the creator channel.
   - Keep Creator Partnerships Lead (£5k/mo) and outreach tooling lines.
   - Remove the variable "Creator rev-share" opex line (now embedded in take-rate).
   - Recompute Y3 break-even coverage and recommended raise.

5. **Exec Summary**
   - Update headline tiles for Y3 / Y5 total net commission and recommended raise with the new numbers.
   - Add a one-line note: *"Creator-led deals: 8% commission to business, split 4% Travidz / 4% creator."*

6. **Sensitivity sheet**
   - The creator heat-map (creators/mo × businesses/creator) now outputs **Travidz net commission at 4%**, not gross. Re-label axis and title.

7. **Sources sheet**
   - Add a short note (S28) documenting the 8% / 4% / 4% structure as a Travidz commercial decision (internal, not a market benchmark).

### Expected directional impact (to be confirmed on rebuild)
- Y5 creator-channel net commission drops from £4.26M to roughly £1.7–£1.9M (≈4% of GBV vs. the previous blended ~10% gross × 80% retained).
- Total Y5 net commission drops from £4.65M to roughly £2.1–£2.3M.
- Recommended raise increases modestly from £1.41M (likely back into the £1.55–£1.75M range) because Travidz now retains less per creator-driven booking, partially offset by removing the explicit 20% rev-share opex line.

### Deliverable
A new file at `/mnt/documents/Travidz_Market_Research_TAM_SOM_v4.xlsx`, QA'd page-by-page (no #REF!/#DIV/0!, print layout intact), with the v3 file kept for comparison.

Approve and I'll build v4.
