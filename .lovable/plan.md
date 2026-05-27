
# Honest price-match: Phase 1 + Phase 2

Ship both phases in one build. Goal: scanner compares the **same property, room/ticket, dates and pax** as the deal — not a generic city search.

## Phase 1 — Feed the scanner what the booking already knows

**Inputs threaded end-to-end**
- `PriceMatchBadge` already passes `check_in`, `check_out`, `guests`. Add `room_id` (when a rate is selected) and `currency`.
- `scanDealPriceMatch` → `runDealPriceMatch` accept all five and include them in the cache key:
  `(deal_id, room_id|null, check_in|null, check_out|null, guests_signature)`.

**Per-network deep-link templates** (built in `price-match-scan.server.ts`)
- Booking.com: `/searchresults.html?ss=<name+postcode>&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&group_adults=N&no_rooms=R`
- Expedia / Agoda / GetYourGuide / Viator: equivalent date+pax query templates.
- Fallback to current `site:` search when template can't be built.

**Richer Firecrawl extraction**
- Upgrade JSON schema in `price-compare.server.ts` to return a list:
  `{ items: [{ name, price, currency, refundable, cancellation_policy }] }`.
- Pick the item whose name best matches the deal's room/ticket title (token overlap + price-band sanity).

**Confidence scoring on every quote**
- `high` — pinned URL hit OR template URL + matching room name + dates/pax echoed back.
- `medium` — template URL but room name not confidently matched.
- `low` — fallback search-results page; price extracted but property/room not verified.
- Auto-issued MATCH codes only fire on `high`. Badge copy degrades gracefully for `medium`/`low` ("indicative" vs "verified").

## Phase 2 — Per-business pinned OTA listings

**New table `business_competitor_urls`**
- Columns: `business_id`, `network` (enum: booking, expedia, agoda, getyourguide, viator, airbnb, vrbo, tripadvisor), `url`, `verified_at`, `last_scraped_at`, `last_status`, `last_error`.
- Unique `(business_id, network)`. RLS: business owner CRUD; service role full.

**Validation (server-side)**
- Host must match the network's domain (e.g. `*.booking.com`).
- URL shape sanity-checked per network (e.g. Booking property pages contain `/hotel/<cc>/<slug>.html`; query-only search URLs rejected).
- Optional one-shot Firecrawl probe on save → stores `verified_at` + property title for display.

**Three entry points to add URLs**
1. Business onboarding — new optional step "Where else are you listed?" with one row per network, "Add another" button.
2. Deal create/edit form — collapsed "Match accuracy" section with summary ("3 sites pinned") and "Edit listings" link to business settings.
3. Price-audit page — inline nudge when a recent scan is `low` confidence or a dispute is opened.

**Scanner logic change**
- If a pinned URL exists for `(business, network)` → append dates/pax and scrape directly (`confidence = high`).
- Otherwise fall back to Phase-1 templates, then `site:` search.
- On 404 / wrong-domain redirect: mark `last_status = broken`, surface a notice on the business dashboard.

## Out of scope (deferred)
- Per-deal URL overrides (deal-level pins on top of business-level pins).
- Official partner APIs (Booking Demand, Expedia EPS, GYG Partner) — need partner approval per network.

## Technical sketch

```text
PriceMatchBadge (deal, check_in, check_out, guests, room_id, currency)
   → scanDealPriceMatch (cached 6h on full key)
      → runDealPriceMatch
          ├─ for each network:
          │    1. pinned URL in business_competitor_urls?  → scrape direct
          │    2. else build template URL with dates+pax    → scrape
          │    3. else site: search                         → scrape
          ├─ extract item list, pick best room/ticket match
          ├─ compute confidence per quote
          └─ cheapest competitor + match_code (only if confidence=high)
```

Files touched:
- DB migration: `business_competitor_urls` (+ GRANTs + RLS).
- `src/lib/price-match-scan.server.ts` — templates, pinned-URL lookup, confidence.
- `src/lib/price-compare.server.ts` — list-of-items schema + room matcher.
- `src/lib/price-match.scan.functions.ts` — accept `room_id`, `currency`; new cache key.
- `src/components/PriceMatchBadge.tsx` — pass `room_id`, degrade copy by confidence.
- New `src/lib/business-competitor-urls.functions.ts` — CRUD + validate + probe.
- New `src/components/business/CompetitorUrlsEditor.tsx` — reusable rows-of-URLs UI.
- Wire editor into: `business.onboarding.*`, `business.deals.$id.edit`, `business.deals.new`, `business.price-audit`.
