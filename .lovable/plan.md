## One-page new listing flow

Merge the "New listing" form and the "Edit listing" page into a single scrolling setup page so operators set up Basics → Rooms & rates → Calendar feeds → Publish without bouncing.

### Changes

**1. `src/routes/business.deals.new.tsx` — bootstrapper**
- On mount, call `createDeal` with seed values: `title: "Untitled listing"`, `is_active: false`, `status: "draft"`, `cancellation_policy_code: "travidz_standard"`, and a category derived from `useAccountKind` (existing logic).
- Redirect with `replace: true` to `/business/deals/$id/edit` so back button doesn't re-draft.
- Render a small "Preparing your listing…" loader while the draft is being created.

**2. `src/routes/business.deals.$id.edit.tsx` — unified setup page**
- Detect `deal.status === "draft"` → header reads **"New listing"** + the existing "Customers always book and pay through Travidz…" intro.
- Move the "Your bank isn't connected yet" amber banner from `new.tsx` here, shown when draft + no payout.
- Sections in order with anchor IDs and clear headers:
  1. **Basics** — `DealForm` with `autoSaveOnBlur` enabled for drafts (silent saves, no Save button mid-flow). Cancellation-policy select (currently on new.tsx) moves above `DealForm` here.
  2. **Rooms & options** — `RoomsAndRatesEditor`.
  3. **Calendar feeds** — `DealCalendarSync`.
  4. **Where else is this listed?** — existing `<details>` block.
- Bottom CTA replaces "Done — back to dashboard":
  - draft + has payout → **Publish listing** (updateDeal with `status: "approved"`, `is_active: true`).
  - draft + no payout → **Save as draft** button + Connect-bank link.
  - already live → **Done — back to dashboard** (unchanged).
- Delete button stays at the bottom.

**3. `src/components/business/DealForm.tsx`**
- Add `autoSaveOnBlur?: boolean` prop. When true, debounce field changes (800ms) and invoke `onSubmit` automatically; hide the submit button.
- Skip the first effect run so hydrated initial values don't immediately re-save.

**4. `OnboardingChecklist`** — no functional change. `calendar`/`rates` links already resolve to `/business/deals/{firstDealId}/edit#calendar|#rates`. When `firstDealId` is null, the existing fallback `/business/deals/new` now auto-drafts and lands the operator on the unified page — the dead-end is gone for free.

### Out of scope
- Server changes (createDeal/updateDeal already accept the needed fields).
- Internal restructure of `RoomsAndRatesEditor` or `DealCalendarSync`.
- Cleanup job for abandoned empty drafts (noted as a follow-up risk).

### Risk
Auto-drafting on page open means an operator who immediately closes the tab leaves a "Untitled listing" draft in their dashboard. Easy to delete; can add a cleanup job later if needed.
