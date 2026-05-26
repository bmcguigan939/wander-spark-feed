## What these two notes actually mean

### 1. Operator payout method check — the `manual_bank` proxy

**What the code does today** (`src/lib/bookable.functions.ts:105`, `:179`, `src/lib/deals.functions.ts:102`):
A deal is only allowed to go `bookable=true` if the owner profile passes a payout gate. That gate accepts **either** of two things:

```ts
p.stripe_connect_payouts_enabled === true   // proper Stripe Connect
|| p.payout_method === 'manual_bank'         // legacy escape hatch
```

The `'manual_bank'` branch is a leftover from before Stripe Connect existed — it lets a business flip a flag on their profile and be treated as "ready for payouts" even though no real bank account, no KYC, and no automated payout path is wired up. If a booking happens against such a profile, Travidz collects the money in its own Stripe balance and there is **no automated transfer** to the partner — it would have to be paid out by hand.

**Why this is a launch blocker:** you said all payouts must be automatic via Stripe Connect. As long as the `manual_bank` fallback is in the gate, an operator/hotel can sit at "bookable" without ever finishing Connect onboarding, and customer money will land in Travidz's account with no automated path out.

**Fix:**
- Remove the `|| p.payout_method === 'manual_bank'` clause from the bookable gate in both `bookable.functions.ts` (two sites) and `deals.functions.ts`. Gate becomes Stripe Connect only: `stripe_connect_payouts_enabled === true` AND `charges_enabled === true`.
- Update the DB validation trigger `deals_validate_operator_markup` the same way — drop the `manual_bank` branch so a deal cannot be saved as bookable without active Connect.
- Migrate any existing rows: for every profile currently sitting on `payout_method='manual_bank'` with no Connect account, auto-unpublish their bookable deals and notify them via `PayoutMethodCard` that they need to complete Connect onboarding before re-publishing.
- Update `PayoutMethodCard` copy to remove "manual bank" as a presented option; Stripe Connect Express becomes the only path.
- Leave the `profiles.payout_method` column in place (don't drop it) so historic audit data is preserved, but stop reading it for gating.

### 2. iframe embed fallback for operator booking-page preview

**What the code does today** (`src/routes/business.signup.tsx:237-255`):
During operator signup we ask for their existing booking page URL and try to render it in an `<iframe sandbox="allow-scripts allow-same-origin allow-forms">`. If the page sends `X-Frame-Options: DENY` / `frame-ancestors 'none'` (most modern booking engines do), the iframe stays blank. The current fallback is just a muted text message "Couldn't embed a preview — that's fine, we'll still save the URL," and signup proceeds with the URL stored as-is.

**Why this came up as a concern:** it doesn't break payments — the URL is still saved and the price-match scanner can still scrape it server-side. The risk is purely **operator trust at signup**: the operator sees a blank box and may abandon. It's also not great UX — `onError` on iframes is unreliable, so the "Couldn't embed" message often never appears; the user just sees an empty frame.

**Fix (UI-only, no business-logic change):**
- Replace the iframe with a server-side reachability + screenshot check:
  - Add a small server fn `checkOperatorSiteUrl({ url })` that does a HEAD/GET, returns `{ reachable, title, finalUrl, frameable }`.
  - If reachable, render a card preview (favicon + site title + final URL) — no iframe needed. This always works regardless of X-Frame-Options.
  - If unreachable / non-200, surface a clear inline error and block the optional URL field from saving until corrected (still lets them skip the optional section entirely).
- Drop the `onError` handler and the `embedFailed` state — replaced by the deterministic server-side check.
- Optional follow-up (not in this plan): generate a real thumbnail via a screenshot service. Out of scope until launch is stable.

### Files touched

- Edit: `src/lib/bookable.functions.ts`, `src/lib/deals.functions.ts`, `src/components/business/PayoutMethodCard.tsx`, `src/routes/business.signup.tsx`
- New: `src/lib/operator-site-check.functions.ts` (server fn for URL reachability)
- New migration: update `deals_validate_operator_markup` trigger; one-time `UPDATE deals SET is_active=false WHERE …` for legacy manual_bank owners without active Connect
- No new secrets

### Smoke checks after the change

1. Profile with `payout_method='manual_bank'` and no Connect → cannot set `bookable=true` (UI + trigger both reject).
2. Profile with active Connect → bookable allowed; Checkout split fires as before.
3. Operator signup with a `X-Frame-Options: DENY` URL → preview card renders (no blank iframe), URL saves.
4. Operator signup with an unreachable URL → inline error, URL not saved unless corrected or section skipped.
