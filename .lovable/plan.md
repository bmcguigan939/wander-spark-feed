
# Finish closed-loop OTA (gates, auto price-match, sweep)

Three workstreams, scoped tight. Activities-specific onboarding UI is deferred to a separate pass.

## 1. Gate-enforce every CTA / outbound surface

Goal: a non-bookable business has **zero** Book CTA, zero outbound link, and zero `/api/public/b/$id` / `/api/public/d/$id` redirect anywhere in the app.

Add a small batched helper `getBookableStatusBatch(businessIds[])` in `bookable.functions.ts` so list views don't N+1.

Audit + enforce on:
- `src/components/feed/VideoCard.tsx` — hide Book/Price tile when business is not bookable; show neutral "Coming soon to Travidz" chip instead.
- `src/routes/u.$username.tsx` (business profiles) — hide all booking CTAs, hide any `business_website_url` rendering, show onboarding-incomplete notice only to the owner.
- `src/routes/search.tsx`, `src/routes/map.tsx`, `src/components/map/ClusteredSheet.tsx` — filter out / grey out non-bookable businesses' Book buttons.
- `src/routes/deals.$id.tsx` — already mostly gated; double-check the "View deal" outbound `window.open(deal.url)` is removed (we are closed-loop now).
- `src/routes/api/public/d.$id.ts` — return 404 (mirror what we did for `b.$id.ts`) so cached deal-redirect links die cleanly instead of pushing to a partner URL.
- `src/routes/api/public/go.$id.ts` and `src/routes/r.$code.ts` — audit; if they push to a partner site, kill them.

## 2. Auto-mint price-match code when Travidz is more expensive

Today `PriceMatchBadge` just says "we'll match at checkout" — no actual code is issued.

- Extend `runDealPriceMatch` (in `price-match-scan.server.ts`) so that when `direct_price_cents > cheapest_competitor_cents`, it inserts a `price_match_codes` row (linked to the deal, not just `affiliate_links`).
- Migration: add nullable `deal_id uuid references deals(id)` to `price_match_codes` + index; keep existing `link_id` path for the legacy affiliate flow.
- The scan endpoint returns the new `match_code` so `PriceMatchBadge` can show "Use code XYZ at checkout — saves £N".
- Checkout (`createBookingCheckout` in `booking.functions.ts`) accepts an optional `matchCode`, validates it against `price_match_codes` for that deal, and reduces the Stripe line-item to the competitor's price.

Cache the issued code in `parity_checks.cheapest_competitor_url`'s row context (already cached 6h) so repeat scans don't mint duplicates — reuse the existing code if the cached scan already has one and it hasn't expired.

## 3. Stale-copy sweep

Grep + replace across the project:
- `8%` / "eight percent" / "8 percent" → 11% — only in commission / commercial copy contexts (skip unrelated `8%` widths, opacities, etc.).
- Any rendering of `profile.business_website_url` outside the dashboard editor → remove. The field can stay in the DB but never reach the traveller UI.
- "Book direct" / "Visit website" / "View on partner" copy → remove or replace with "Book on Travidz".

Files to check first (high signal): `email-templates/business-invite.tsx`, `email-templates/business-digest.tsx`, `business.calculator.tsx`, `business.apply.tsx`, `business.signup.tsx`, `landing/LandingPage.tsx`, `legal.business-agreement.tsx`, `OnboardingChecklist.tsx`.

## Out of scope this pass
- Activity-specific onboarding UI (time-slot editor, meeting point / languages / includes-excludes inputs, "rooms" → "rooms or options" relabel). Tackled in a follow-up.

## Verification
- Manually load `/deals/$id` for one bookable + one non-bookable deal in preview and confirm the CTA/badge behaviour.
- Hit `/api/public/d.$id` and `/api/public/b.$id` via `invoke-server-function` — both 404.
- Trigger a price-match scan on a deal that's deliberately overpriced and confirm a `price_match_codes` row is minted and surfaced.
