## Goal

Two tightly-linked changes:

1. **Move commission to a flat 8%**, split 50/50 (creator 4%, Travidz 4%) everywhere it appears — code, contracts, calculators, marketing copy, and database defaults.
2. **Price-match authorisation + transparency**: businesses contractually authorise Travidz to automatically match any cheaper third-party price at click time, and Travidz gives the business full, auditable evidence for every match so they can verify it was fair.

## 1 — Commission update to 8%

### Code
- `src/lib/commission.ts` → `{ totalPct: 8, creatorPct: 4, platformPct: 4 }`.
- Audit and update every surface that displays the old 5% / 2.5% / 2.5%:
  - `src/routes/business.calculator.tsx`
  - `src/routes/creator.earnings.tsx`
  - `src/routes/business.apply.tsx`
  - `src/routes/legal.business-agreement.tsx`
  - `src/routes/legal.creator-agreement.tsx`
  - `src/routes/legal.terms.tsx`
  - Marketing copy in `src/routes/index.tsx`, `welcome.tsx`
  - Any email template that mentions percentages (`src/lib/email-templates/*`)

### Database
One migration:
- `ALTER TABLE business_invites ALTER COLUMN commission_pct SET DEFAULT 8.00`
- `ALTER TABLE business_invites ALTER COLUMN creator_share_pct SET DEFAULT 4.00`
- `ALTER TABLE business_invites ALTER COLUMN platform_share_pct SET DEFAULT 4.00`
- Existing `deal_applications.commission_pct` rows are kept (historic record); new applications default to 8.
- Existing `deal_redemptions.commission_rate` is per-row, untouched (historic bookings settle at the rate that applied when they were made).
- Existing `affiliate_partners.commission_pct` is *partner-side* (what the OTA pays us) — leave alone.

### Re-acceptance
Because we're changing economics, surface a one-time banner on next login for:
- All `business` role users → must re-accept Business Agreement before creating/editing deals.
- All `creator` role users → must re-accept Creator Agreement before adding new affiliate links.

Track via existing `profiles.business_agreement_accepted_at` and `profiles.creator_agreement_accepted_at`. Clear the timestamps with a one-off insert; agreement pages already update them on accept.

## 2 — Price-match authorisation + transparency

### Contract additions (Business Agreement)

New "Best Price Guarantee & Price-Match Authorisation" clause, required at onboarding:

> **The Business hereby authorises Travidz to:**
>
> (a) **Automatically check** the publicly bookable price for the same room/activity/date/party size on supported third-party platforms (Booking.com, Expedia, GetYourGuide, Viator, Agoda, Skyscanner, Airalo, and others as added) at the moment any traveller clicks to book.
>
> (b) **Issue a one-time match code** (format `TRAVIDZ-MATCH-XXXXXX`, valid 24 hours) to that traveller when a third-party price is lower, honouring the third-party price minus Travidz's 8% commission, which the Business agrees to accept.
>
> (c) **Record and retain evidence** of every price match — competitor URL, captured screenshot, price/currency/dates/party-size used, timestamp, and cryptographic hash — and make it visible to the Business in real time via the dashboard.
>
> The Business represents they can lawfully price-match per their own OTA parity agreements (most OTA contracts permit lower direct rates). Travidz invoices 8% of the matched price; the Business keeps the remaining 92%.

Worked example (rendered in agreement and dashboard):

```text
Booking.com price:        £200    (their commission ~18% → you net £164)
Travidz match price:      £200    (our commission 8%   → you net £184)
Difference per booking:   +£20 in your pocket, same price to the traveller
Creator earns:            £8     (50% of the £16 commission)
```

### Product: how the authorisation is exercised

**Schema additions (one migration):**

- `affiliate_links.link_kind` enum: `direct_business` | `ota_affiliate` | `creator_affiliate` (default `creator_affiliate`).
- `affiliate_links.business_id` — nullable FK to a business profile, required when `link_kind = 'direct_business'`.
- `affiliate_links.supplier_type` — `hotel`/`activity`/`flight`/`transfer`/`esim`/`other`.
- `affiliate_links.supplier_ref` — string (Booking hotel_id, GYG activity_id, etc.) for exact matching.
- `affiliate_links.canonical_key` — normalised `name|city|country|type` for fuzzy match when no supplier_ref.
- `affiliate_links.parity_exempt boolean default false` + `parity_exempt_reason text` (for legitimately exclusive Travidz-only rates).
- New table `price_quotes` — per-network cached competitor prices `(link_id, network, url, price_cents, currency, check_in, check_out, pax, fetched_at, ttl_seconds, evidence_url, evidence_hash)`. Unique on `(link_id, network, check_in, check_out, pax)`.
- New table `price_match_codes` — `(code PK, link_id, business_id, traveller_user_id nullable, original_price_cents, matched_price_cents, currency, competitor_network, competitor_url, evidence_url, evidence_hash, issued_at, expires_at, status: 'issued'|'redeemed'|'expired'|'disputed', dispute_reason text, dispute_resolved_by uuid)`.
- New table `parity_checks` — append-only audit log of every check Travidz ran (one row per check, even when no breach). `(link_id, ran_at, providers_checked text[], cheapest_network, cheapest_price_cents, direct_price_cents, action: 'no_breach'|'match_issued'|'exempt'|'no_data')`.
- Extend `deal_redemptions` with `match_code_id uuid` and `matched_from_price_cents int` so settlements traceably reference the match.

All new tables with RLS: business sees only their own rows; traveller sees only codes issued to them; admin sees all.

**Server modules:**

- `src/lib/price-compare.server.ts` — adapter per network (`bookingCom`, `getYourGuide`, `viator`, `expedia`, `agoda`, `skyscanner`, `airalo`). Each returns `{ network, url, price_cents, currency, available, evidence_url, evidence_hash, fetched_at }` or `null`. Phase 1 ships **Booking.com adapter** + **Firecrawl fallback** for everything else (using `formats: [{ type: 'json', schema }]` to extract price + a separate `screenshot` capture stored as evidence). Parallel calls with 1500ms per-provider timeout; results cached in `price_quotes`.
- `src/lib/match-codes.server.ts` — issues `TRAVIDZ-MATCH-XXXXXX` (8 base32 chars, signed), writes `price_match_codes` row, returns code + expiry.

**Click flow** (update `/api/public/d/$id` and `/api/public/go/$id`):

```text
click → load link
      → if parity_exempt or link_kind != 'direct_business' → existing wrap+redirect
      → else:
          read price_quotes cache (refresh stale rows in background)
          write parity_checks row (always — proves we checked)
          if direct ≤ cheapest competitor (after 8% adjustment):
              302 to direct URL
          else:
              issue match code
              302 to /book/match/$code
```

**Traveller-facing interstitial `/book/match/$code`:**

Server-rendered single screen showing the code, expiry, matched price vs. original, competitor source, and one CTA "Book direct with match code" that appends `?travidz_match=TRAVIDZ-MATCH-XXXXXX` to the business URL so booking systems that accept a discount code can auto-apply it.

### Transparency dashboard for businesses

This is the core of "demonstrate it has been matched fairly." New tab in `src/routes/business.index.tsx`: **Price-match audit**.

Three views:

1. **All checks** (`parity_checks` rows). Live log: "13 May 14:32 — Booking, GYG, Viator checked → no breach". Demonstrates we're not only showing breaches.
2. **Match codes issued** (`price_match_codes` rows). For each code:
   - Original direct price vs. matched price (delta highlighted)
   - Competitor network + clickable original URL
   - **Evidence preview**: screenshot taken at check time, served from storage
   - Evidence hash (SHA-256 of the screenshot + price payload) — businesses can verify tampering hasn't occurred
   - Timestamp + traveller (anonymised until redeemed)
   - Status (issued / redeemed / expired / disputed)
   - **"Dispute this match"** button → opens a form requiring counter-evidence (URL or screenshot showing the price was actually different, e.g. different dates). Admin reviews. Resolved disputes mark the code `disputed` and exclude it from settlement.
3. **Settlement summary** — for each redeemed match: "You honoured £182 (matched from Booking £182). Travidz invoiced £14.56 (8%). Creator earned £7.28. Your net: £167.44." Exportable CSV for accounting.

Weekly digest email (using existing `email-send.server.ts`):
> "This week we ran 287 price checks across your 12 listings. 4 matches were issued, 3 were redeemed. Total extra margin captured vs. losing to OTAs: £62. View full audit."

### Storage

New Supabase storage bucket `price-evidence` (private). Each screenshot lives at `price-evidence/{link_id}/{check_id}.png`. Signed URLs (1-hour TTL) served to businesses through a server function so we can audit access.

## What ships first (MVP, ordered)

1. **Commission to 8% / 4% / 4%** across `commission.ts`, calculator, earnings, legal pages, marketing, email templates, and DB defaults. Trigger agreement re-acceptance.
2. **Schema migration**: `link_kind`, supplier fields, `parity_exempt`, `price_quotes`, `price_match_codes`, `parity_checks`, `deal_redemptions` extensions, evidence bucket.
3. **Business Agreement clause** + onboarding/re-acceptance flow surfacing the price-match authorisation explicitly.
4. **`price-compare.server.ts`** with Booking.com adapter + Firecrawl fallback + screenshot evidence capture.
5. **Click flow** updated; `/book/match/$code` interstitial.
6. **Business "Price-match audit" tab** with full check log, evidence previews, hash verification, dispute flow, settlement summary.

Follow-ups: more network adapters; weekly digest email; per-listing parity-exempt toggles in the business deal editor; admin dispute-resolution queue.

## Technical notes

- All provider calls run server-side; partner API keys never reach the browser. We'll request additional secrets (`BOOKING_API_KEY`, `GETYOURGUIDE_API_KEY`, …) as each adapter is wired. Firecrawl is already configured.
- Match codes are short, signed, and stored — `price_match_codes` is the source of truth; the string is just a lookup key.
- Existing `compute_redemption_commission` trigger continues to work — it receives the matched price as `order_value_cents` and applies the per-row `commission_rate` (which will be 8 for new redemptions). The 50/50 creator/platform split is a payout-time computation; no schema change needed.
- Evidence hashes use SHA-256 of `screenshot_bytes || JSON.stringify(canonical_quote_payload)`. Stored on the row; business can recompute from the served screenshot to verify.
- `parity_checks` is append-only — no UPDATE/DELETE policies — so the audit trail is immutable from the business's perspective.
