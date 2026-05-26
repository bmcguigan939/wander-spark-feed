## Two legal/onboarding fixes

### 1. Section 7(c) — keep it, but tighten the language

You asked whether we can actually screenshot, save and report. Yes — and that's already wired up:

- `src/lib/price-compare.server.ts` calls the scraper with `formats: ["screenshot"]`, grabs the returned screenshot URL, and stores it as `evidence_url` on every `parity_checks` row.
- It also computes a SHA-256 hash over `{url, network, price, currency, fetched_at, screenshot}` and stores it as `evidence_hash` for tamper-detection.
- The business sees every entry on `/business/price-audit` with the screenshot link and dispute button.

So the clause is truthful. I'll leave the substance but make two small edits in `src/routes/legal.business-agreement.tsx` so it's tighter and less marketing-y:

- "real time" → "promptly" (scans run on click, but "real time" sounds like a promise we'd have to defend)
- "removed from settlement" → "the match is voided" (clearer, no separate "settlement" concept exists)

If you'd rather change something else in (c) — shorter dispute window, drop the 14-day clause, etc. — tell me and I'll adjust.

### 2. Remove the website URL field from the business invite/claim flow

In `src/routes/business.invite.$token.tsx`:

- Remove the "Your website (where customers book)" `<Input>` and its helper text.
- Remove the `website` state, validation, and from the submit payload.
- Replace the offer copy to reflect the new model:
  - "Your direct website stays the destination — no rebranding" → "Your store lives on Travidz — no website needed; we host the booking page."
- The "Accept & claim your listing" button stays; the agreement checkbox stays.

In the backend (`src/lib/business-invites.functions.ts` accept handler):
- Make the `website` / direct URL field optional (don't insert into `affiliate_links` if not provided).
- On accept, ensure the business profile is flagged as Travidz-hosted so the booking CTA points to the Travidz deal page / Stripe checkout instead of an external URL.

In `src/routes/legal.business-agreement.tsx`:
- Update §5a / wherever it implies the business must have their own website. The operator-markup paragraph already works for Travidz-hosted stores since it routes through Stripe Connect — just remove the "we deliberately exclude your own website from the comparison set" line for businesses with no external site, or qualify it ("where you have one").

### Out of scope
- Building a richer Travidz-hosted storefront editor (rooms/rates editor already exists at `RoomsAndRatesEditor.tsx`).
- Migrating existing accepted invites that already have a `website` recorded — they keep theirs.

### Files touched
- `src/routes/legal.business-agreement.tsx`
- `src/routes/business.invite.$token.tsx`
- `src/lib/business-invites.functions.ts`

No DB migration needed — `affiliate_links.url` stays nullable for Travidz-hosted businesses (or we point it at the Travidz deal page URL).
