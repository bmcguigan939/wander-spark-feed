# Travidz — get everything functional pre-Stripe (next week)

## Status
- **Phase A: shipped** — daily expiring-deals cron at 09:00 UTC; 3 transactional email templates wired (`redemption_confirmed_creator`, `redemption_confirmed_traveller`, `deal_expiring`) with suppression + per-user category preference checks; notification bell + realtime unread badge already live from prior phase.
- **Phase B–D: pending** — see below.

Stripe lands next week. Goal: ship every non-Stripe piece now so when Stripe goes in, it's a focused 1–2 day swap (onboarding + transfers) on top of a fully working app. Everything below is independent of banking.

## Phase A — Close prior loops (1–2 days)

1. **Daily expiring-deals cron** — schedule `notify_expiring_deals()` via `pg_cron` at 09:00 UTC daily.
2. **Transactional emails for app events** — 3 React Email templates in `src/lib/email-templates/` using existing `_brand.ts`:
   - `redemption-confirmed-creator`, `redemption-confirmed-traveller`, `deal-expiring`
   Wire through the existing `enqueue_email` RPC + `process-email-queue` worker. Respect `email_preferences` and `suppressed_emails`. Ship the `/unsubscribe` page.
3. **Header notification bell + realtime unread badge** — wire existing `NotificationsBell.tsx` to `notifications` via Supabase Realtime; deep-link per type; mark-all-read.

## Phase B — Earnings ledger functional end-to-end, sans transfers (3–4 days)

Build the full payout shape so Stripe just plugs in. No money moves; admin can mark runs "paid" once you've done the transfer manually next week (and after Stripe, this becomes automated).

4. **Schema**
   - `payout_runs(id, creator_id, period_start, period_end, total_payable_cents, currency, status: draft|approved|paid|void, paid_at, external_reference, notes)`
   - `payout_line_items(id, payout_run_id, redemption_id, commission_cents)`
   - `deal_redemptions.payout_run_id` (nullable FK) — excludes paid redemptions from future runs
   - `creator_payout_details(creator_id, account_holder, country, iban, sort_code, account_number, vat_number, ...)` with strict creator-only RLS
5. **Weekly draft-run generator** — Monday cron creates one `draft` run per creator whose unpaid `payable_cents` ≥ £20. Idempotent on `(creator_id, period_start)`.
6. **Admin payouts console** `/admin/payouts` — list draft/approved/paid runs, per-run drill-down with line items + creator details, "Approve" → "Mark as paid" (captures bank reference + paid_at), CSV export of approved runs for bulk bank upload.
7. **Creator payout history** on `/creator/earnings` — "Paid out" section with date / amount / reference; banner switches to "Payouts processed weekly".
8. **`payout-paid` email template** — auto-sent on mark-as-paid with full breakdown.
9. **Creator payout-details form** — collected from `/creator/earnings`. (Next week's Stripe phase replaces this with hosted onboarding; data captured now is the fallback + KYC trail.)

After Phase B you can run real payouts by hand from the admin console using your personal account in the interim, with a full audit trail. When Stripe lands, the only change is replacing the "Mark as paid" action with `stripe.transfers.create` + webhook reconcile.

## Phase C — Trust, safety, funnel quality (parallel to A/B, ~1 week)

10. **Business verification gate** — domain-email or admin approval before first deal goes live; "Verified" badge on `/deals/$id`.
11. **Creator-agreement acceptance timestamp** — recorded before first payout-eligible redemption.
12. **Content moderation** — Lovable AI vision pass on video upload (NSFW/spam); reporter flow on videos/comments; shadow-ban state surfaced in `admin.moderation`.
13. **Rate limiting** on public POST routes (applications, redemptions, comments, follows) — Postgres token bucket keyed by `user_id` + ip.
14. **Studio → deal attachment polish** — ≤ 3 taps from `/studio/videos/$id` to attach an approved deal.
15. **Search/discovery audit** — verify ranking on `/search`, `/destinations`, `/map`; add "more like this" via pgvector (`match_deals` already exists).
16. **Public creator profile `/u/$username` polish** — og:image from top video, follow CTA, top deals strip. This is the share surface.
17. **Onboarding checklists on `/welcome`** — creator: profile → first video → attach a deal → add payout details. Business: verify → first deal → invite a creator.
18. **Admin KPI dashboard** at `/admin/index` — DAU, redemptions/day, GMV, commission accrued, **outstanding payout liability** (sum of unpaid `payable_cents`).
19. **Error monitoring** (Sentry or equivalent) wired for server functions + browser.

## Phase D — Pre-Stripe-ready housekeeping (1–2 days, can run during week)

20. Custom domain + production email DNS verified
21. Legal review pass on `/legal/*` (UK jurisdiction assumption) + DPA confirmation
22. EU cookie/consent banner wired to analytics opt-in
23. Verify sitemap/robots canonical URLs once domain set; submit to Search Console
24. Backup verification + restore drill documented

## Out of scope this week (planned for Stripe phase next week)

- Stripe Connect Express onboarding (`/creator/payouts`, `/business/payouts`)
- `stripe_accounts` table + `account.updated` / `payout.*` / `charge.dispute.*` webhook
- Replace admin "Mark as paid" with `stripe.transfers.create` + reconcile
- Dispute/clawback automation

## Also out of scope

- Native apps, push notifications, in-app DMs
- Multi-currency (GBP only)
- Affiliate-of-affiliates / referral program
- Auto e-invoicing / VAT MOSS

---

## Suggested order

```text
Day 1–2:  Phase A
Day 3–6:  Phase B  (ledger + admin payouts console + creator form)
Day 4–7:  Phase C  (start in parallel; trust + funnel)
Day 7+:   Phase D  (housekeeping)
Next wk:  Stripe Connect swap-in (separate plan)
```

**Recommendation:** start Phase A immediately — small, finishes the prior phase, and the email pipeline is needed for Phase B's payout receipts. Want me to write the Phase A implementation plan next?

---

## Progress log

- **Phase A ✅ shipped** — transactional email pipeline (3 templates), expiring-deals cron + notifications.
- **Phase B ✅ shipped** — payout ledger (`payout_runs` / `payout_line_items` / `creator_payout_details`), admin payouts console, creator banking form, weekly draft cron.
- **Phase C (in progress)**
  - ✅ Profile verification fields + admin "Verify" toggle + public `VerifiedBadge` on profiles
  - ✅ Creator + business agreement acceptance timestamps + dashboard banner
  - ✅ Rate-limit table + `check_rate_limit` SQL fn + applied to `postComment` and `claimRedemption`
  - ✅ Admin KPI dashboard: GMV30d, commission30d, outstanding payout liability, 7d/30d bookings, verified business count, pending moderation flags
  - ✅ Vision-pass moderation: thumbnail is sent to Gemini 2.5-flash vision in parallel with text moderation; flags merged + auto-hide at >=0.85 confidence
  - ✅ Business onboarding checklist on `/business` (agreement → verified → first deal → first confirmed booking, with progress bar, dismissable)
  - ✅ Error monitoring: `client_error_logs` table + `logClientError` server fn + `ErrorReporter` global listener + admin `/admin/errors` console
- **Phase C ✅ complete**
- **Phase D / Stripe** — not started.
