# Travidz: B9–B12 + Nice-to-haves

## Scope
Finish the pre-launch must-haves (B9–B12) and add the three nice-to-have items (OTA adapters, PWA, currency normalisation). Banking/payouts remain out of scope (next week).

---

## B9 — Seed demo content
Real `auth.users` rows are needed, so seeding is two-stage:

1. Add an **admin seeding panel** at `/admin/seed` (admin-only) with a "Seed demo content" button. Pure server-fn that uses `supabaseAdmin`:
   - Calls `supabase.auth.admin.createUser()` for 3 creators + 3 businesses (fixed emails like `demo.creator1@travidz.test`, auto-confirmed, random passwords surfaced once in the UI).
   - Grants matching `app_role` rows (`creator` / `business`).
   - Inserts ~8 deals (Lisbon, Bali, Tokyo, Marrakech, NYC, Reykjavik, Cape Town, Mexico City) with images, prices, lat/lng, `parity_exempt=false`.
   - Inserts 12 videos (Mux playback IDs from a small fixture list of public test streams) linked to creators, each with an `affiliate_link` pointing at one of the seeded deals.
   - Idempotent: skips if `demo.creator1@travidz.test` already exists; "Reset demo" button wipes only rows tagged `source='demo_seed'`.
2. Tag every seeded row with `source='demo_seed'` (deals already has a `source` column; add the same convention to videos via a `metadata` JSON or a new `is_demo` boolean — prefer reusing `deals.source` pattern).

**Why a panel, not SQL:** `auth.users` cannot be created from a migration; needs the admin API. Keeps it repeatable across environments.

---

## B10 — Booking attribution beacon
Goal: when a traveller returns to Travidz after booking on the partner site, auto-create a `pending` `deal_redemptions` row pre-filled with the match code.

1. Add a new public route `src/routes/api/public/attribute.ts` (GET) that accepts `?match=<code>&order_value=<cents>&currency=<iso>&external_ref=<partner_booking_id>`.
2. Handler (uses `supabaseAdmin`):
   - Looks up `price_match_codes` by `code`, verifies status `issued` and not expired.
   - Resolves `deal_id` + `creator_id` via the `affiliate_link` → `deals` join.
   - Inserts `deal_redemptions` row: `status='pending'`, `match_code`, `matched_from_price_cents`, `order_value_cents`, `currency`, `notes='auto-attributed'`.
   - Flips match code to `pending_redemption` (new enum value — or reuse `issued` and rely on redemption row).
   - 302-redirects to `/book/match/{code}/thanks` (a new thin "we're tracking your booking" page).
3. **Outbound URL augmentation**: in `src/routes/api/public/go.$id.ts`, when a match code is issued, append `&travidz_match={code}&travidz_return=https://travidz.app/api/public/attribute?match={code}` to the partner URL where the partner supports return-URL params (Booking.com `aid`, Expedia `camref`). For partners that don't, the traveller still uses the existing manual flow.
4. Add a `partner_url_template` column on `affiliate_partners` so admins can configure the return-param shape per network. Default null = no auto-append.

---

## B11 — CSV export on /business/price-audit
1. New server fn `exportPriceAuditCsv` in `src/lib/price-match.functions.ts` (`requireSupabaseAuth`, business-scoped). Returns a CSV string with columns: `date, link_label, competitor_network, direct_price, competitor_price, action, match_code, status, evidence_url`.
2. Wire the existing "Export CSV" button on `src/routes/business.price-audit.tsx` to call it and trigger a browser download via `Blob` + `URL.createObjectURL`.
3. Respect current filter state (date range, link filter).

---

## B12 — Per-listing parity-exempt in deal/link editor
1. Locate the existing deal/link editor (likely `src/routes/business.deals.$id.tsx` and/or the affiliate-link create dialog). Read those files first.
2. Add the same `parity_exempt` toggle + mandatory `parity_exempt_reason` textarea that already exists in `business.price-audit.tsx` Listings tab.
3. Extract the toggle into a shared component `src/components/business/ParityExemptToggle.tsx` so both surfaces share the same logic and validation.

---

## NTH-1 — Native OTA adapters
Replaces Firecrawl scraping for the three big networks. Adapter pattern:

1. New folder `src/lib/ota-adapters/` with one file per network:
   - `booking-com.server.ts` — Booking.com Affiliate API (Demand API). Requires `BOOKING_AFFILIATE_ID` + `BOOKING_API_KEY`.
   - `skyscanner.server.ts` — Skyscanner Partners "Flights Live Prices". Requires `SKYSCANNER_API_KEY`.
   - `expedia-ean.server.ts` — Expedia EAN Rapid API. Requires `EAN_API_KEY` + `EAN_SHARED_SECRET`.
2. Each exports `fetchPrice(canonicalKey, { checkIn, checkOut, pax }): Promise<{ priceCents, currency, url, evidenceUrl }>`.
3. Refactor `src/lib/price-compare.server.ts` to dispatch by `affiliate_links.supplier_type`: native adapter when available, fall back to Firecrawl otherwise.
4. **Secrets to request from user** (do not add until they confirm): the 5 keys above. Will skip adapters whose key is absent and just keep using Firecrawl for that network.

---

## NTH-2 — PWA install + push notifications
1. Add `vite-plugin-pwa` to `vite.config.ts` with `registerType: 'autoUpdate'`, manifest (name, short_name "Travidz", theme `#000`, icons from `src/assets/`).
2. Create `src/components/PWAInstallPrompt.tsx` — listens for `beforeinstallprompt`, shows a dismissible bottom-sheet on the traveller feed after the 3rd visit (tracked in `localStorage`).
3. **Push notifications**: register a service-worker push listener that subscribes via the Push API. Store subscription endpoints in a new `push_subscriptions` table (`user_id`, `endpoint`, `p256dh`, `auth`, RLS owner-only). Send pushes from the existing weekly digest cron + on new match-code issuance using `web-push` library with VAPID keys.
4. **Secrets to request**: `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (I'll explain how to generate via `npx web-push generate-vapid-keys`).

---

## NTH-3 — Per-business currency normalisation
1. Add `default_currency` (text, 3-letter ISO) to a new `business_settings` table (or `profiles` if simpler — prefer new table for clean separation), defaulting to `'GBP'`.
2. Add an exchange-rate cache table `fx_rates` (`base`, `quote`, `rate`, `fetched_at`). Refresh daily via a new cron hitting `/api/public/cron/fx-refresh` which calls a free FX API (frankfurter.app — no key needed).
3. In `price-compare.server.ts` parity logic: if competitor `currency` ≠ direct `currency`, convert competitor → direct using latest `fx_rates` row before declaring a breach. Store both raw and normalised prices on `parity_checks` (add `normalised_competitor_price_cents`, `fx_rate_used` columns).
4. Display "≈ £X (converted from $Y at 0.79)" in the audit UI and on the match interstitial.

---

## Execution order
1. **B11** (smallest, pure frontend wiring) — warm up
2. **B12** (extract shared component, drop into editor)
3. **B10** (attribution beacon — needs partner_url_template migration)
4. **B9** (admin seed panel — touches auth admin API)
5. **NTH-3** (currency — migration + cron + compare-logic refactor)
6. **NTH-1** (OTA adapters — pause here to request API keys before coding adapters)
7. **NTH-2** (PWA + push — last; needs VAPID keys + service worker)

## Open questions before I start
1. **Demo seed reset behaviour**: do you want a "Reset demo content" button that wipes seeded rows, or one-shot only?
2. **Attribution beacon trust model**: should I require an HMAC signature on `?match=` returns to prevent fake commission claims, or trust that the match code itself is the secret? (Codes are short — HMAC is safer.)
3. **OTA API keys**: do you already have Booking.com Affiliate / Skyscanner Partners / Expedia EAN accounts, or should I pause NTH-1 entirely until you do?
4. **Push notifications scope**: travellers only, or also business/creator notifications (new match code, new redemption)?

I'll wait on answers to 1–4 before implementing, then go straight through B11 → NTH-2.
