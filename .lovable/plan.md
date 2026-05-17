## Travidz — launch-readiness review

Scope: everything except creator banking/payouts processor wiring (planned for next week).

---

### 1. What's built and shipped

**Auth & identity**
- Email/password + Google sign-in, password reset, agreement acceptance, profile, settings.
- Roles: `traveller` / `creator` / `business` / `admin` with `has_role()` RLS pattern. Re-acceptance banner live after 8% switch.

**Traveller**
- Feed, search, map, destinations index + country/city pages, itineraries (AI-generated), collections, profiles `u/$username`, notifications, deal pages, sounds, comments/likes/follows.

**Creator (Studio)**
- Video upload (Mux), drafts, schedule, link cards, affiliate links, deal applications, analytics, earnings, payout details form.

**Business**
- Invite-by-token onboarding, apply flow, deal create/edit, redemption confirmation desk, applications inbox, commission calculator, **price-match audit tab** (new).

**Admin**
- Deals review, AI discoveries queue, error logs, moderation, payouts, users, videos.

**Commerce & best-price**
- Flat 8% commission (4%/4%), updated everywhere (calculator, earnings, legal, marketing, DB defaults).
- Click flow `/api/public/go/$id` runs parity check for `direct_business` links → issues `TRAVIDZ-MATCH-XXXXXXXX` (24h) → `/book/match/$code` interstitial.
- Business audit page shows every check + every code + dispute action; SHA-256 evidence hash recorded.
- Legal: Business Agreement clause authorising auto-match.

**Platform**
- Mux video webhook, AI deal discovery (Firecrawl + embeddings), email queue + send worker, sitemap, robots, error capture, rate-limiting.

---

### 2. Still to BUILD (pre-launch must-have)

| # | Item | Notes |
|---|---|---|
| B1 | **Direct-price lookup in parity check** | `runParityCheck` currently passes `direct_price_cents: null`, so a match is issued whenever any competitor is found. Needs to fetch the business's own price (from `deals.price_cents` for the matching listing, or scrape the direct page) so we only match when the business is actually more expensive. |
| B2 | **Match-code → redemption settlement** | `deal_redemptions.match_code` and `matched_from_price_cents` columns exist but nothing populates them when a business confirms a booking. Add a "Applied with TRAVIDZ-MATCH-…" field to `business.redemptions.tsx`; flip `price_match_codes.status` to `redeemed`, link to the redemption, and have the commission trigger settle from `matched_from_price_cents`. |
| B3 | **Admin dispute-resolution queue** | Businesses can file disputes (`status = 'disputed'`) but there's no admin UI to approve/reject + write resolution. Add `admin.disputes.tsx`. |
| B4 | **Schedule the existing cron jobs** | `/api/public/cron/discover-deals` and `/api/public/cron/expiring-deals` are coded but no `pg_cron` schedule rows exist. Need `cron.schedule` inserts: discovery hourly, expiring-deals daily, plus a new parity-check sweep every 6h for active `direct_business` links. |
| B5 | **Weekly digest email to businesses** | Planned in best-price spec. Summarises checks run, matches issued, extra margin captured vs OTAs. New cron + template. |
| B6 | **Per-listing parity-exempt toggle** | Column `affiliate_links.parity_exempt` exists; expose checkbox + reason field in business link/deal editor for genuinely exclusive Travidz-only rates. |
| B7 | **Screenshot evidence capture** | `price_quotes.evidence_url` is always null today. Add Firecrawl `screenshot` format → upload PNG to private `price-evidence` bucket → store signed URL on `price_quotes`/`price_match_codes` so the audit page can render the screenshot, not just the hash. |
| B8 | **Public marketing surfaces refresh** | Verify `/welcome`, `/legal/*`, and `index.tsx` reflect 8% + best-price guarantee messaging end-to-end (legal already updated; marketing pages need a sweep). |
| B9 | **Onboarding seed content** | DB is empty: 0 videos, 0 deals, 0 affiliate links, 0 businesses. Need at least a handful of real or demo creators/businesses/deals so the feed, map and search don't look dead on launch day. |

### 3. Still to BUILD (nice-to-have, post-launch acceptable)

- Native OTA adapters (Booking.com Affiliate API, Skyscanner, Airalo, Expedia EAN) to replace Firecrawl-only price compare. Faster + more accurate than scraping.
- PWA/install prompt + push notifications.
- Email custom domain (check current state via Email settings).
- Booking attribution beacon — accepting `?travidz_match=…` from the partner URL on return.
- Per-business CSV export for accounting from the audit page (button present, wiring needed).

---

### 4. Still to TEST (manual QA checklist, no automated tests exist)

| Area | Critical paths |
|---|---|
| Auth | Sign up (email + Google), email confirm, reset password, role gating, agreement re-accept banner |
| Creator | Upload via Mux, link card to direct business, deal application, earnings page totals match `commission_cents` |
| Business | Token-invite → first deal → redemption confirm → audit tab populates → dispute round-trip |
| Traveller | Feed scroll perf on iOS Safari + Android Chrome, search, map markers, itinerary generation latency |
| Best-price | Click a direct_business link → match code issued → interstitial → competitor link opens → audit shows check + code + hash |
| Redemption | Confirmed booking emits notification + email + counts toward payout |
| Payouts | `generate_draft_payout_runs()` produces correct drafts; admin approve → mark paid flow |
| Discovery | Run discover-deals cron once manually → admin queue populates → approve → goes live |
| Email | Each template renders, queue drains, unsubscribe link works |
| Cron | All scheduled jobs fire on schedule and log success in `function_edge_logs` |
| Security | RLS spot-checks via `supabase--linter`; check Definer functions + storage policies |
| SEO | `sitemap.xml`, `robots.txt`, per-route `head()` metadata, OG images on deal pages |

Automated tests: none exist (`*.test.*` returns 0 files). Recommend smoke-level Vitest + a single Playwright happy-path for the click→match→audit flow before launch.

### 5. Still to COMMISSION (configuration / external setup)

| # | Item |
|---|---|
| C1 | **Schedule cron jobs** via `cron.schedule()` (depends on B4) — discover-deals, expiring-deals, parity-check, weekly-digest, email-send-worker. |
| C2 | **Custom domain & email DKIM/SPF** — confirm Travidz custom domain is connected and auth + transactional emails ship from `@travidz.<tld>`. |
| C3 | **Connector inventory** — confirm Firecrawl is connected with sufficient credits; decide whether to add Booking.com Affiliate Partner Centre + Skyscanner Partners API keys now or post-launch. |
| C4 | **Mux** — confirm webhook secret set in prod, env points at live Mux env not sandbox. |
| C5 | **`LOVABLE_API_KEY`** — confirm production tier sized for itinerary generation throughput. |
| C6 | **Google OAuth** — verify redirect URLs include production + custom domain. |
| C7 | **Storage buckets** — `price-evidence` exists (private ✓), `deal-images` public ✓, `avatars` public ✓. Confirm sizing/quotas. |
| C8 | **Supabase linter pass** — run once and triage warnings (function search_path, Definer warnings, RLS gaps). |
| C9 | **Publish + DNS** — production publish, propagate custom domain, smoke test on real device. |

---

### 6. Explicit "out of scope this week"

- Creator banking / payout processor (Stripe Connect / Wise / manual). Schema (`creator_payout_details`, `payout_runs`, `payout_line_items`) is ready and admin flow exists in draft → approved → paid states; only the actual money-movement integration is deferred to next week.

---

### Implementation status

- B1 direct-price lookup — **done**
- B2 match-code settlement — **done**
- B3 admin dispute queue — **done** (`/admin/disputes`)
- B4 cron scheduling — **done** (4 jobs live in `cron.job`: discover hourly, expiring daily 08:00, parity sweep every 6h, business digest Mondays 09:00)
- B5 weekly business digest — **done** (`business-digest.tsx` template + `/api/public/cron/business-digest`)
- B6 parity-exempt toggle — **done**
- B7 screenshot evidence — **done**
- B8 marketing sweep — **done** (best-price bullet added to business invite offer card; no stale 10% copy remains)
- B9 seed demo content — **deferred to you**: needs real auth.users sign-ups for demo creators/businesses; can be done from the admin tools without code changes.

Remaining for launch: run the QA matrix in §4, run `supabase--linter`, and complete C1–C9 commissioning steps in §5 (banking still next week).
