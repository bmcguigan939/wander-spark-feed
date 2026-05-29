## Dedicated property photos page

Today, the "Add property photos" checklist item links to `/business#photos`, which dumps operators on the entire dashboard (My Deals, calculator, banks, etc.) just scrolled to the photos card. Make it a focused, single-purpose page.

### Changes

1. **New `src/routes/business.photos.tsx`**
   - Auth guard (mirror `business.deals.$id.edit.tsx`): redirect to `/login` if no user, `/business/apply` if not a business.
   - `MobileShell` with a back link to `/business`.
   - Header: **"Property photos"** (activity operators: **"Activity photos"**, picked via `useAccountKind`), plus the existing intro copy ("Add at least 3 photos … Tap the star to choose your cover photo.").
   - Body: `<BusinessPhotosEditor businessId={user.id} kind={photosKind} />` — nothing else.
   - Bottom CTA: **Done — back to dashboard** button (navigates to `/business`).
   - `head()` sets title `Property Photos — Travidz`.

2. **`src/lib/bookable.functions.ts`**
   - In `gateLinkFor`, change `case "photos"` from `/business#photos` to `/business/photos`. No other gates touched.

3. **`src/routes/business.index.tsx`**
   - Remove the `BusinessPhotosEditor` card from the dashboard so photos only live on the dedicated page (and the related `id="photos"` anchor / heading wrapping it). Keeps the dashboard about deals + ops, not setup.

### Out of scope
- No changes to `BusinessPhotosEditor` itself, the photo functions, or storage.
- No change to other onboarding gates' destinations.

### Risk
Anyone with a bookmark to `/business#photos` lands on the dashboard with no anchor target. Acceptable — the new page is one tap away from the checklist, which is where operators reach this from in practice.
