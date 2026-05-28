## Goal

Produce three deliverables in one turn:

1. A clean, founder-voiced .docx reply to Paul that incorporates Brendan's 13 corrections.
2. Live numbers from Lovable Cloud slotted into Q3 + Q6 (founding count, waitlist count, total creators).
3. A v6 deck cut (`Travidz_Elevator_Pitch_v6.pdf` + `.pptx`) that surfaces the v6 financial model's strongest workings — the gap Paul flagged ("model > deck").

## DB facts already pulled

- `profiles.is_founding_creator = true` → **0**
- `profiles.founding_creator_number IS NOT NULL` → **0** (no one numbered yet)
- `launch_waitlist` → **0 rows**
- Total profiles → **14** (internal/test)

So Q3/Q6 honestly reads: **founding programme expanded from 500 → 5,000; not invite-only; targeted at established YouTube/TikTok/Instagram travel creators with existing hotel-comp deals; programme not yet opened to the public, no waitlist live yet, numbers will be reported as the cohort fills.** No fabricated "~3k waitlist" anywhere.

## Corrections to apply to Paul's reply

| Q  | Change |
|----|--------|
| 1  | Keep as-is. |
| 2  | Rewrite GTM around targeting established travel creators on YouTube / TikTok / Instagram who already have hotel-comp affiliate relationships. They bring (a) supply-side credibility, (b) huge traveller reach, (c) a halo that pulls in everyday side-hustle creators. No paid traveller CAC at steady state. |
| 3  | Founding cohort = **5,000** (matches `V6_DEFAULTS.foundingCap` in `src/lib/investor-model/assumptions.ts`). No waitlist yet — programme hasn't opened publicly. Current DB: 0 founding, 0 waitlist. |
| 4  | Replace AI-guessed team with Brendan + Linda as co-founders. Leave room for Brendan to add titles/bios. |
| 5  | Add explicit citation: "v6 financial model, `creatorsActiveByYear` = [500, 2400, 6800, 14000, 24000] × `gbvPerActiveCreator` £18,500 → Y1 GBV ~£9.25M, Y5 GBV £444M; see `assumptions.ts` and `/admin/investor`." |
| 6  | Same — £18,500 GBV/active creator/yr matches the v6 model exactly. Cite same source. Drop the speculative £500/mo and 3× claim. |
| 7  | Keep as-is. |
| 8  | Keep as-is. |
| 9  | Add a one-line caption: "Glovo/Deliveroo city-launch curve = couriers/restaurants are scarce at month 0, fully scheduled by month 6, oversupplied by month 9 in each city — the supply side flips from outbound-heavy to inbound." |
| 10 | Reword: **no cash refund of the difference**. Badge is a "cheaper than other resellers" signal only (matches `legal.terms.tsx` §4). Confirmed no refund promise exists in T&Cs. |
| 11 | Rewrite around the actual v6 take rate: 11% gross commission, Stripe 2.9% + £0.20 shared off the top, remaining net pool split per tier (50/50/50/40/30). Remove restaurants from operator mix — Travidz only takes bookable+prepayable supply (stays + tours/experiences); restaurants can be tagged in creator content but are not affiliated revenue. |
| 12 | Drop DoorDash/Toast comp. Replace with: TikTok Shop UK (live, 2023–24), LTK/ShopMy (creator-economy comp), Airbnb Experiences relaunch (2024) — recent and directly relevant. |
| 13 | Confirm deck v6 hasn't been built yet (latest in `/public/decks/` is v5). Build v6 in this turn. |

## Deliverables

1. **`/mnt/documents/Travidz_Paul_Response_v2.docx`** — rewritten reply, founder voice, citations to v6 model where relevant, live DB numbers in Q3/Q6.

2. **Deck v6** — new script `scripts/build_elevator_pitch_v6_pptx.mjs` + `.py` mirroring v5 structure. Outputs `public/decks/Travidz_Elevator_Pitch_v6.pdf` and `.pptx`. Slide deltas vs v5:
   - Founding 500 → **Founding 5,000**
   - New "Unit Economics" slide pulling straight from v6 model: 11% gross / Stripe shared / tiered split / blended take rate ~4.65%
   - New "Operator mix → 11% gross" slide (stays 8–12%, tours 15–25%, weighted to 11%)
   - New "GBV/creator distribution" slide (founding-locked 50/50, power tier at £25k rolling 12mo)
   - "Creator GTM" slide reframed around established YouTube/TikTok/Instagram creators with existing hotel-comp deals
   - Remove restaurants from operator mix visuals
   - QA pass: render every slide to image, inspect for overflow/clipping before delivering

3. **No code changes** to app routes, schema, or business logic. `foundingCap: 5000` is already in `V6_DEFAULTS` — nothing to migrate.

## Out of scope

- T&C edits (confirmed already compliant)
- DB schema changes
- Re-running scenarios (bear/bull) in the deck — v6 model already serves these on `/invest`; deck stays base case
- Updating v5 PDFs (leave for archive)

## Files touched

- **Create:** `/mnt/documents/Travidz_Paul_Response_v2.docx`
- **Create:** `scripts/build_elevator_pitch_v6.py`, `scripts/build_elevator_pitch_v6_pptx.mjs`
- **Create:** `public/decks/Travidz_Elevator_Pitch_v6.pdf`, `public/decks/Travidz_Elevator_Pitch_v6.pptx`
- **Edit:** none in `src/`
