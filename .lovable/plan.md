## Problems
1. **"Book through Travidz" tick is pointless** — every shop books through Travidz. Operators (activities, tours, experiences) build their storefront on Travidz the same way hotels do: photos, prices, packages. Customers never leave for an operator's own site.
2. **Deal-builder loses work** when "Create deal" is hit without Stripe payout connected: the form gets wiped.
3. **No guided order** on the business home — users can start step 4 before step 2, which triggers problem 2.

## Fix

### A. Travidz is the only checkout path (remove operator-markup entirely)
- Delete the "Book through Travidz" toggle from `DealForm.tsx`.
- Delete the external **Link URL / Booking URL** field from the deal form for every business type.
- Server-side: force `book_via='travidz'` on insert/update in `src/lib/deals.functions.ts`; reject any incoming `external_url`.
- Public deal page: remove the "Book on operator site" CTA — only the Travidz checkout button remains.
- Copy: operator shop setup framed like a hotel ("Add your activities and packages, set prices, upload photos — customers book directly on Travidz").
- **Migration:** drop `deals.external_url` and `deals.book_via` columns (plus any unused index/policy referencing them). Same migration sweeps `null`/legacy values first. Audit `src/lib/operator-site*`, `price-compare.server.ts`, `price-match*`, public deal route, and admin views for references and remove them.

### B. Don't lose work when payout isn't ready
- **Save as draft instead of blocking.** On "Create deal" with no Stripe payout: save with `status='draft'`, show inline banner *"Saved as draft. Connect your bank to publish."* + **Connect bank** button. On return, one tap to publish. **Unlimited drafts.**
- **Autosave to localStorage** (debounced 1s) keyed by user + draft id. Restore on form mount.
- Files: `src/components/business/DealForm.tsx`, `src/lib/deals.functions.ts`, `src/routes/business.deals.new.tsx`.

### C. Guided setup order on `/business`
Reorder `OnboardingChecklist` and gate steps:

```text
1. Verify your business        (legal name, address)
2. Connect your bank           (Stripe Connect)        ← unlocks step 4
3. Add property/venue photos   (3+ recommended)
4. Add your first listing      ← fully greyed-out until 1+2 done
```

- Step 4 is **fully disabled** (greyed card, lock icon, not clickable) with tooltip *"Finish bank setup to publish your first listing"* until steps 1 and 2 are complete.
- Step 5 (share/invite creator) **removed** — creators reach out to businesses directly through Travidz once the shop is live.
- Empty business home gets a single **Start setup** CTA dropping the user into step 1.
- Files: `src/components/business/OnboardingChecklist.tsx`, `src/routes/business.index.tsx`.

### D. Smooth Stripe return
- On `/business/onboarding/payout` success, auto-route to the next incomplete step (drafts page if drafts exist, otherwise the listing builder). File: `src/routes/business.onboarding.payout.tsx`.

## Out of scope
- Deal-form Essentials/Advanced split (covered in prior plan).
- Changes to Stripe Connect itself.
