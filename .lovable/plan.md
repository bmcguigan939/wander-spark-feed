## Build `Travidz_Market_Research_TAM_SOM_v5.xlsx`

Two linked changes plus one defensive addition for investor conversations.

### 1. Flat 50/50 commission across ALL channels (your ask)

**Cover sheet — replace creator-only inputs with global splits:**
- `Creator-onboarded gross commission %` = 8.0%  → Travidz 4.0% / Creator 4.0%
- `Paid-UA / organic gross commission %` = 10.0% → Travidz 5.0% / Creator 5.0%
- `Travidz share of all commission` = **50%** (single global driver — change once, model recalculates)

**SOM Scenarios sheet:**
- Paid-UA block (rows ~30–60): net commission line now = `GBV × gross% × 50%` instead of `GBV × gross%`
- Creator block (rows ~61–122): already at 4% net, no change
- Roll-up: combined Y3 / Y5 net commission both drop ~40–45%

**Revenue Engine sheet:** update flywheel labels to "50/50 on every booking" and recompute blended take-rate (now flat 4–5% net regardless of channel mix).

### 2. Sensitivity sheet → combined commission (your ask)

- Break-even tiles switch from paid-UA-only to **combined (paid + creator) net commission**
- Add explicit **"Annual"** label on Y3 / Y5 tiles so it's unambiguous for investors
- Heat-map (CPI × Conversion) now outputs combined Y5 net commission
- Add a second mini heat-map: **Creators/month × Businesses/creator** → combined Y5 net commission (the creator-channel sensitivity that matters under 50/50)

### 3. NEW — Tiered scenario tab (defensive, for VC Q&A)

Add a `Scenarios — Rev-Share Tiers` sheet with three side-by-side cases:

| Scenario | Creator share | Y3 net | Y5 net | Raise |
|---|---|---|---|---|
| A — Flat 50/50 (your pitch) | 50% forever | ~£280k | ~£2.0M | ~£1.9M |
| B — Tapered | 50% Y1, 40% Y2, 30% Y3+ | ~£340k | ~£2.7M | ~£1.7M |
| C — First-£10k bonus | 50% on first £10k GBV/creator, then 30% | ~£380k | ~£3.0M | ~£1.6M |

This lets you lead the pitch with "50/50, creator-first" but answer the inevitable VC question "how does this look at scale?" without flinching.

### 4. Raise & Runway recalc
- Lower Travidz net → higher raise needed (likely £1.8–2.0M vs. current £1.57M)
- Founders' £15k/mo salaries from month 1 retained
- Y3 break-even coverage will drop to ~25–30% under flat 50/50 (vs. 48% in v4)

### 5. Exec Summary update
- Headline tiles refresh with new numbers
- Add a callout box: *"Creator-first economics: 50% of every commission goes to the creator who drove the booking. Best-in-class vs. Booking Affiliates (~30%), LTK (~70% but on lower take-rate), Stay22 (~50%)."*
- Add a one-line note explaining the tiered alternative is modelled on the Scenarios tab

### 6. Sources
- S29: Booking.com Affiliate Partner Programme commission share (public)
- S30: Stay22 / Travelpayouts creator payout benchmarks
- S31: LTK / ShopMy creator economics (for cross-vertical comparison)

### Deliverable
`/mnt/documents/Travidz_Market_Research_TAM_SOM_v5.xlsx`, QA'd page-by-page, with v4 kept for comparison. I'll flag the projected headline numbers (Y3/Y5 combined, recommended raise, coverage) in the reply when it's built so you can sanity-check before we move on to the pitch deck.

**One thing I'd like you to confirm before I build:**
Do you want me to model **flat 50/50 only** (your literal ask), or **flat 50/50 as the headline + the tiered scenarios alongside it** as decision support? I'd strongly recommend the latter — it costs nothing to model and gives you a real answer when a VC pushes on long-term margin.
