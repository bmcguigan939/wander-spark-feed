
# Two pathways in business setup: Stays vs Activities

## Problem
The 16-step wizard at `/business/setup` assumes every business is a stay. Step 1 only offers Apartment / Home / Hotel / Alternative places, and the rest of the flow (rooms & rates, breakfast, parking, long stays, pay-at-property, cancellation policies) is stay-specific. An activity operator invited by a creator has nowhere to say "I run tours / experiences / classes" and ends up answering hotel questions.

## Solution
Add a fork at the very start of the wizard, then run one of two tailored paths.

### New Step 0 — "What does your business offer?"
Two large tiles:
1. **Stays** — hotels, apartments, villas, B&Bs, unique stays. → existing 16-step path (becomes Steps 1–16 unchanged).
2. **Activities & experiences** — tours, classes, tastings, rentals, spas, attractions. → new shorter path (below).

Stored on `profiles.setup_business_type` enum: `stay` | `activity`.

### Activities path (new, ~10 steps)
Mirrors the Booking.com-feel but tuned for GetYourGuide/Viator-style listings:

1. Activity category — tour, experience, class/workshop, rental, food & drink, wellness, attraction/ticket, transport, other.
2. Format — group / private / self-guided / ticket-only.
3. Location — meeting point address + map (reuses `BusinessLocationPrompt`).
4. Languages offered (reuses Step 8).
5. Host / operator profile (reuses Step 9 — display name, bio, "about your activity").
6. First package — uses `DealForm` with `category` locked to `do` / `tour` and price-per-person fields (reuses `deal_time_slots` for schedule).
7. Photos — ≥5, `BusinessPhotosEditor` with `kind="activity"`.
8. Pricing & policies — per-person price, group min/max, cancellation policy.
9. Booking model — instant vs request (reuses Step 10).
10. Payments → legal entity → go live (reuses Steps 11, 15, 16).

Skipped vs Stays path: unit count, OTA imports (Airbnb/Vrbo/Expedia don't apply — replace with a single "GetYourGuide / Viator URL" capture), channel manager, facilities list, breakfast/parking, long stays, rooms & rates editor.

### Resume + branching logic
- `getMySetupState` returns `setup_business_type` and `setup_step_completed`.
- The wizard component picks the step array based on `setup_business_type`. Each path has its own step count for the progress bar.
- If `setup_business_type` is null (existing users mid-wizard), they re-see Step 0 once and continue.
- `ensureFirstDeal` already sets `category` from `setup_property_kind`; extend it so `setup_business_type === 'activity'` gives `category = 'do'` and a sensible default title.

### Knock-on fixes
- `OnboardingChecklist`'s `gateCopy` reads `accountKind` to swap stays vs activity wording. Update it to prefer `profiles.setup_business_type` (then fall back to the legacy detection) so a freshly-onboarded activity operator sees activity wording everywhere — this fixes the "why is the page focused on activities?" issue from earlier in the other direction.
- `business.apply.tsx` "Resume property setup" CTA copy → "Resume business setup" (kind-agnostic).
- Booking page (`/book/$dealId`): the Booking.com-flavoured chrome stays for stays. For activities, hide the room-rate table and amenities grid, show "What's included / What to bring / Meeting point / Duration / Group size" instead, and keep the same sticky reserve bar (per-person price × guests).

## Backend changes
One migration:
- `profiles.setup_business_type` enum `'stay' | 'activity'` nullable (default null so existing rows aren't forced).
- `profiles.activity_category text` nullable.
- `profiles.activity_format text` nullable.
- `profiles.activity_meeting_point text` nullable.
- `deals.price_unit text` nullable (`per_night` | `per_person` | `per_group` | `flat`) — needed so booking page knows what to multiply.

New / updated server fns in `src/lib/business-setup.functions.ts`:
- `saveSetupBusinessType({ setup_business_type })` — Step 0.
- `saveSetupActivityBasics({ activity_category, activity_format })`.
- `saveSetupActivityLocation({ address, lat, lng, meeting_point })`.
- Reuse `saveSetupHostProfile`, `saveSetupLanguages`, `saveSetupBookingModel`, `saveSetupPayments`, `saveSetupLegalEntity`, `completeSetup`.

## Out of scope
- Real ticketing / availability calendar beyond what `deal_time_slots` already supports.
- Pickup-location management beyond a single meeting point.
- Translating activity descriptions.
- Migrating existing `setup_property_kind = 'alternative'` rows (they stay as stays; the operator can change later).

## Files touched
- `supabase/migrations/<new>.sql` — schema additions + GRANTs already present.
- `src/lib/business-setup.functions.ts` — new fns, extended `ensureFirstDeal`.
- `src/routes/business.setup.tsx` — Step 0 fork, activity step components, branching renderer.
- `src/components/business/OnboardingChecklist.tsx` — prefer `setup_business_type` for copy.
- `src/routes/book.$dealId.tsx` — activity-variant chrome + price_unit multiplier.
- `src/routes/business.apply.tsx` / `src/routes/business.index.tsx` — copy tweak.

