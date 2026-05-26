## Goal

Travidz becomes a Booking.com-style closed loop for **stays AND activities**: every bookable listing is fully merchandised, booked, and paid on Travidz. No outbound links to partner sites — ever. Commission is 11%. Travidz automatically price-matches against third-party sites.

## 1. Hard "Bookable on Travidz" gate

A listing (stay OR activity) is bookable only when ALL of these are green:

| Gate | Stays | Activities |
|---|---|---|
| Property/operator photos | ≥3 gallery photos | ≥3 gallery photos |
| Inventory items | ≥1 active **room** with ≥1 photo | ≥1 active **activity option** (tour/session/class) with ≥1 photo |
| Rates | ≥1 active rate plan (price + cancellation + payment timing) | ≥1 active rate plan per option |
| Calendar | iCal sync connected (strict — protects against double-bookings) | iCal sync OR native time-slot schedule |
| Payouts | Stripe Connect / manual bank | Same |

New helper `getBookableStatus(businessId) → { bookable, missing: [...] }` — single source of truth used by feed, profile, deal page, search, map, admin.

## 2. Zero outbound links to business sites

- `business_website_url` is **never** rendered as a clickable link anywhere.
- `/api/public/b/$id` redirect endpoint returns **404 for everyone** (kills cached old links).
- Non-bookable listings → neutral notice "This partner isn't accepting bookings on Travidz yet." No CTA, no URL.
- Bookable listings → only CTA is "Book on Travidz" → `/deals/$id` (or `/book/$dealId` if single rate).
- Legacy `/api/public/d/$id` affiliate redirect kept ONLY for non-property/non-activity categories (e.g. flights) that we don't natively book yet; hidden from stays + activities flows.

## 3. Photo galleries (stays AND activities)

New table `business_photos`:
- `business_id`, `url`, `caption`, `category` (stays: exterior/lobby/dining/pool/view/amenity; activities: location/equipment/group/highlight/other), `sort_order`, `is_cover`
- Soft cap 50 per business (validated client + server)
- Storage bucket `business-photos` (public read; owner write via folder = business_id)

Per-inventory-item galleries (rooms + activity options):
- `deal_rooms.photos` already exists; bump cap from 10 → 20
- Activity options will share the same schema (see §4)
- Bucket path: `{business_id}/items/{item_id}/...`

Traveller surfaces: full-width gallery on profile + `/deals/$id` (swipe on mobile, grid on desktop, lightbox on tap).

## 4. Activities support (new)

Reuse the existing `deals` infrastructure with `category = 'activity'` (enum already exists). Activities differ from stays in two ways:

**a. Inventory units = "activity options" not rooms.** Extend `deal_rooms` to act as a generic "bookable item" by adding `item_kind text default 'room' check (item_kind in ('room','activity_option'))`. Activity options reuse: `name`, `description`, `photos`, `max_guests`, `inventory_total`, `sort_order`, `is_active`. New nullable fields: `duration_minutes`, `meeting_point`, `languages text[]`, `includes text[]`, `excludes text[]`.

**b. Calendar = time-slots not nights.** Extend `deal_external_calendars` to support iCal feeds with VEVENTs treated as bookable slots (already works). For native scheduling, add `deal_time_slots` table: `deal_id`, `room_id` (the activity option), `starts_at`, `ends_at`, `capacity`, `booked`, `is_active`. Calendar-sync cron already exists; tweak to handle slot-blocking too.

Business onboarding for activities mirrors stays — same gate, same photo flow, same payout setup. UI labels swap "Rooms" → "Activity options", "Nights" → "Sessions". Same `bookable` flag, same Stripe Checkout path.

## 5. Commission = 11% everywhere

`commission.ts` already has `totalPct: 11`. This update sweeps remaining stale strings:
- `bookings.commission_pct` default `8.00` → `11.00` (migration)
- `business_invites.commission_pct` default `8.00` → `11.00` (migration)
- `business_invites.creator_share_pct` `4.00` / `platform_share_pct` `4.00` → recomputed at booking time (already done via `loadCreatorSplit`); update defaults to `5.50` for display only
- UI/email copy audit: `business.calculator.tsx`, `business-digest.tsx`, `business-invite.tsx`, onboarding checklist, deal-creation form — all read from `COMMISSION.totalPct`

## 6. Automatic price-match scan

On every `/deals/$id` view and again at `/book/$dealId` checkout, server fn `runPriceMatchScan({ dealId, checkIn, checkOut, guests })`:

- Firecrawl-scans Booking.com, Expedia, Hotels.com, Agoda, Airbnb (stays) or Viator, GetYourGuide, Tripadvisor Experiences (activities)
- Configurable per-business competitor list
- Results stored in `parity_checks` (extend with `scanned_urls jsonb`, `cheapest_competitor_cents`, `cheapest_competitor_network`, `cheapest_competitor_url`)
- Cached 6h per (deal, date range, guests) to control Firecrawl spend
- Display rules:
  - Cheaper on Travidz → green badge "Best price — £X cheaper than Booking.com"
  - Same price → blue badge "Price matched with Booking.com, Expedia +2 sites"
  - More expensive elsewhere not found → no badge (silent)
  - More expensive on Travidz → auto-issue match code (existing `match-codes.server.ts`) and show "We've matched the £X price you'd find on Booking.com — applied at checkout"
- Nightly `parity-sweep` cron (already exists) keeps a baseline

## 7. UI surfaces touched

| Surface | Change |
|---|---|
| Feed `VideoCard.tsx` | Bookable → "Book on Travidz" pink CTA. Non-bookable → no button, no link. |
| Profile `u.$username.tsx` | Photo gallery hero. Bookable → CTA. Non-bookable → neutral notice. No website link ever. |
| `/deals/$id` (stays + activities) | Gallery hero, item cards w/ photos, price-match badge, rate selector → Book. |
| `/book/$dealId` | Price-match badge re-confirmed at checkout. |
| Business dashboard `OnboardingChecklist.tsx` | New 5-step gate: Photos · Items (rooms/options w/ photos) · Rates · Calendar · Payouts. Each red item deep-links to its editor. |
| `RoomsAndRatesEditor.tsx` | Per-item photo uploader; rename labels when `category = 'activity'`. |
| New `BusinessPhotosEditor.tsx` | Property/operator-wide gallery manager. |
| `business-digest.tsx`, `business-invite.tsx` | "You're not bookable yet — add photos, items, rates, calendar, payouts. We charge 11% on confirmed bookings only." |
| Admin `admin.deals.tsx` | "Bookable status" filter + per-row missing-gates chip. |
| `/api/public/b/$id` | Returns 404 always. |
| `business.deals.new.tsx` | Commission copy 8% → 11% (already shows 11% in current code, audit pass). |

## 8. Day-one behaviour for existing matched-only listings

- Hide Book button + any website link immediately.
- Video keeps location tag for context only.
- Outreach email to those businesses explaining the new gate and steps to go live.

## Technical notes

**Schema migrations:**
- `business_photos` table + RLS + indexes
- `parity_checks` extended columns
- `deal_rooms` add `item_kind`, `duration_minutes`, `meeting_point`, `languages`, `includes`, `excludes`
- `deal_time_slots` table for native activity scheduling
- `bookings.commission_pct` default → 11.00
- `business_invites` commission defaults → 11.00 / 5.50 / 5.50
- Storage bucket `business-photos` with owner-folder RLS

**New files:** `src/lib/bookable.functions.ts`, `src/lib/business-photos.functions.ts`, `src/lib/price-match-scan.server.ts`, `src/components/business/BusinessPhotosEditor.tsx`, `src/components/PhotoGallery.tsx`, `src/components/deals/PriceMatchBadge.tsx`.

**Edited files:** `feed.functions.ts`, `VideoCard.tsx`, `u.$username.tsx`, `OnboardingChecklist.tsx`, `RoomsAndRatesEditor.tsx`, `deals.$id.tsx`, `book.$dealId.tsx`, `b.$id.ts`, `business-digest.tsx`, `business-invite.tsx`, `admin.deals.tsx`, `business.calculator.tsx`, `business.deals.new.tsx`.

**Firecrawl** already wired as a connector — used server-side only.

## Explicitly out of scope (separate workstreams)

- Auto-importing existing Booking.com/Airbnb/Viator listings — manual entry for v1
- Loyalty / Genius-style traveller tiers
- Multi-currency display (GBP only; FX already stored)
- Embedding partner sites in iframes — never (opposite of the goal)
- Flights, car hire — stay on legacy affiliate redirect until natively supported

## Result

Every stay AND every activity the traveller sees is either fully bookable on Travidz (photos, items, rates, calendar, payouts, price-matched) or shows no booking surface at all. Zero outbound links. 11% commission everywhere. Automatic price-matching against the major third-party sites in each category.