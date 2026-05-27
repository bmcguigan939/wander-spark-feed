## Price-match accuracy: pass deal context + per-business OTA listings

Two-part change: make the existing scanner use the data we already have (Phase 1), and let businesses pin their own OTA listing URLs so the scanner stops guessing (Phase 2).

### Phase 1 — Feed the scanner what the deal already knows

Today the price scanner mostly runs off `title + city`. The deal already carries everything needed for an apples-to-apples quote — we just stop throwing it away.

- Always pass `check_in`, `check_out`, `guests` (adults / children / rooms), `room_id`, and `currency` into `runDealPriceMatch`.
- Build per-network deep-link templates so the scrape lands on the right dates/pax:
  - Booking.com: `…/searchresults.html?ss=<name+postcode>&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&group_adults=N&no_rooms=R&group_children=C`
  - Expedia / Hotels.com / Agoda equivalents
  - GetYourGuide / Viator: activity search + date
- Upgrade the Firecrawl JSON schema to return a room/ticket list: `{ name, price, currency, refundable, cancellation }` — not just the cheapest headline number.
- Cache key becomes `(deal_id, room_id, check_in, check_out, guests_signature)` so two different date ranges don't collide.
- Each scraped quote records `match_confidence` (high / medium / low) and `match_notes` (what was matched on: name, postcode, room-name fuzzy score). Auto-issued MATCH discount codes only fire on `high`.

### Phase 2 — Per-business pinned OTA listings

A new optional "Competitor listings" section on the business profile. Once pinned, the scanner skips search for that business × that network and goes straight to the exact listing page with dates/pax appended.

- New table `business_competitor_urls` keyed by `business_id` with one row per (network, URL). Repeatable rows in the UI — businesses can add as many as they want, leave it empty, or fill some networks and not others. Optional, never blocking.
- Networks supported at launch: Booking.com, Expedia, Hotels.com, Agoda, Trip.com, GetYourGuide, Viator. Easy to extend.
- Validation per network:
  - Host must match the network's domain (e.g. `booking.com`, `www.booking.com`, `secure.booking.com`).
  - URL shape sanity-checked (e.g. Booking property URLs contain `/hotel/<cc>/<slug>.html`; GYG contains `/-t<id>` or `/-l<id>`).
  - Reject query-only search URLs ("this looks like a search results page, paste the property page instead").
- Where the prompt appears (all three):
  - **Business onboarding** — new optional step "Add your listings on other sites" with a skip button.
  - **Deal create / edit form** — collapsed "Match accuracy" section showing the business's pinned URLs read-only with an "Edit listings" link to the business profile.
  - **Price audit page** — when a quote is flagged low-confidence or the business disputes a match, inline nudge: "Pin your Booking.com URL to make this exact" with a one-click add.
- Scanner logic:
  1. If a pinned URL exists for `(business, network)` → scrape it directly with dates/pax appended. Confidence = `high`.
  2. Otherwise fall back to Phase-1 search-based matching.
  3. If a pinned URL 404s or stops returning rooms, surface a "your pinned Booking.com link looks broken — update it?" notice on the business dashboard (OTAs occasionally re-slug URLs).

### Out of scope

- Per-deal URL overrides (deferred — per-business is enough for ~95% of cases; sister-property edge cases can be added later if real data shows we need it).
- Official partner APIs (Booking Demand API, Expedia EPS, GYG Partner API) — those need partner approval per network.

### Why this answers the original question

Yes — businesses pasting their exact OTA listing URLs is enough for the scanner to compare the same property, room type, dates, and pax. The "search by name + postcode" path is the fallback for businesses who don't pin anything; the pinned URL path is the deterministic, one-click-fix path for the cases where search drifts (chains with sister properties, renamed listings, OTA search-results pages above the property page, etc.).

### Technical notes

- `business_competitor_urls`: `business_id`, `network` (enum), `url` (text), `verified_at`, `last_scraped_at`, `last_status`. Unique on `(business_id, network)` — one URL per network per business. RLS: business owners read/write their own; service role full access for the scanner.
- Validation runs both client-side (zod schema per network) and inside the `createServerFn` that saves the row.
- Scanner change is isolated to the `runDealPriceMatch` server fn + the Firecrawl JSON schema + the URL-builder helpers per network. No change to the discount-code issuing logic except gating on `match_confidence`.
- All Phase 1 changes ship first and independently; Phase 2 can ship right after without re-touching the scanner core.
