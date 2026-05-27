## Phase 2 follow-on — finish the price-match scanner

Five slices, all targeting the same goal: make the scanner produce **like-for-like** comparisons and only issue MATCH codes when we're sure.

### 1. Surface the OTA editor at deal-creation time

Two entry points beyond the audit page:
- **Onboarding** (`/business/onboarding/website`): after the website step, add a soft "Pin your OTA listings (optional)" panel using `CompetitorUrlsEditor`. Skippable — never gates progression.
- **Deal create/edit** (`business.deals.new.tsx`, `business.deals.$id.edit.tsx`): inline collapsible "Where else is this listed?" section that opens the same editor. Same business-level data — explained in the help text so businesses understand pins apply to all their deals on that network.

### 2. Confidence-aware `PriceMatchBadge`

- Pass `match_confidence` through `scanDealPriceMatch` return → `PriceMatchBadge`.
- Copy ladder:
  - `high` → "Cheaper here — MATCH-XXXX" (code shown, redeemable).
  - `medium` → "We think we're cheaper" (no code, link to competitor).
  - `low` → silent (no badge, scan still logged for the audit page).
- **MATCH codes are only auto-issued on `high`** — enforce in `ensureMatchCode` guard.

### 3. Context-aware scanner inputs (`room_id`, `currency`, dates, pax)

- `scanDealPriceMatch` already takes `check_in/out/guests`; add `room_id` and thread it through `runDealPriceMatch` so per-room cache keys work (DB column already exists from last migration).
- Build per-network **deep-link templates** so search/scrape lands on the right date+pax page:
  - Booking.com: `/searchresults.html?ss=<name+postcode>&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&group_adults=N&no_rooms=R`
  - Expedia: `/Hotel-Search?destination=...&startDate=...&endDate=...&adults=N`
  - GYG / Viator: append `?date=YYYY-MM-DD&participants=N`
- When a pinned URL exists, append the same date/pax query params before scraping (templates encoded per network).
- Persist `room_id` + `currency` on the `parity_checks` row.

### 4. Multi-item Firecrawl schema

- Upgrade `PRICE_SCHEMA` from `{ price, currency }` to:
  ```
  { items: [{ name, price, currency, refundable?, cancellation_policy? }] }
  ```
- After scrape, run a small matcher: fuzzy-match `item.name` against the deal's room/ticket name. Confidence rules:
  - Pinned URL + name match ≥ 0.8 → `high`
  - Pinned URL, no name match → `medium` (pick cheapest item, note "room not matched")
  - No pin, search result hit → `low`
- Store `matched_item_name` + `match_notes` on `parity_checks`.

### 5. Surface broken / wrong-domain pinned URLs

- When scrape returns 0 items, record `last_status = 'no_price'` on `business_competitor_urls`; on 404/redirect-off-host, record `'broken'` / `'wrong_domain'` + `last_error`.
- `CompetitorUrlsEditor` already renders `last_status` — add a yellow banner at the top of `/business/price-audit` when any pinned URL is in a bad state, linking to the **OTA URLs** tab.
- Add the same warning chip to `OnboardingChecklist` so it's visible from the dashboard.

### Out of scope (still)
- Per-deal URL overrides (business-level pin is sufficient for v1).
- Official partner APIs (Booking Demand, EPS, GYG Partner) — needs partner approval per network.

### Technical sketch

```text
PriceMatchBadge(dealId, roomId?, dates, guests)
  └→ scanDealPriceMatch  (6h cache: deal+room+dates+guests)
       └→ runDealPriceMatch
            ├─ getPinnedCompetitorUrls(business_id)
            ├─ per network: pin → template-rewrite(dates,pax) → scrape(items[])
            │                   else findUrl(site:) → scrape(items[])
            ├─ matchItem(items, deal.room_name) → confidence
            ├─ ensureMatchCode  (only if confidence === 'high')
            └─ writeParityCheck(room_id, confidence, matched_item_name, notes)
```

### Files touched

- `src/lib/price-match-scan.server.ts` — multi-item schema, deep-link templates, confidence, room_id wiring, pinned-URL status writeback.
- `src/lib/price-match.scan.functions.ts` — accept `room_id`, return confidence + matched name.
- `src/components/PriceMatchBadge.tsx` — confidence-aware copy, code only on `high`.
- `src/components/business/CompetitorUrlsEditor.tsx` — already renders status, no changes needed.
- `src/routes/business.onboarding.website.tsx` — append optional editor panel.
- `src/routes/business.deals.new.tsx`, `src/routes/business.deals.$id.edit.tsx` — collapsible "Where else is this listed?" section.
- `src/routes/business.price-audit.tsx` — bad-pin warning banner.
- `src/components/business/OnboardingChecklist.tsx` — bad-pin chip.
- No new migration required (room_id / match_confidence / match_notes / last_status all exist from the last migration).
