## New listing — copy + validation tightening

Pure copy/UX changes. No new backend logic.

### 1. Title field — `src/components/business/DealForm.tsx`
Replace the bare "Title" label with a label + helper line:
- Label: "Listing title"
- Helper (small, muted, under the input): "Use the exact name shown on Booking.com / Expedia / GetYourGuide etc. Travellers and our price-match scanner match by name — mismatches break the match."

### 2. Link URL field — `src/components/business/DealForm.tsx`
Rename and clarify:
- Label: "Your website or direct booking page"
- Helper: "Your own site for this listing (not your Booking.com / OTA page). Used as the 'visit website' link on your Travidz card."
- Keep field optional (it already is).

### 3. "Active" checkbox — `src/components/business/DealForm.tsx`
Remove the standalone "Active" checkbox from the form. It duplicates the Publish / Draft flow and confuses operators (publishing already sets `is_active: true`; unpublished drafts are inactive). The form will simply omit `is_active`, and `publishNow` in the edit route continues to set it to `true`. Existing live listings keep their value — no migration.

### 4. Rate plans guidance — `src/components/business/RoomsAndRatesEditor.tsx`
Update the subhead under "Rooms & rates / Packages & rates / Rate plans" (line 84-90) to append a parity reminder, e.g.:
- Lodging: "Add the room types you sell, each with one or more rate options. **Prices must match what you advertise on Booking.com, Expedia, etc. — unless you're offering it cheaper on Travidz.**"
- Activity: same trailing sentence appended.
- Generic: same trailing sentence appended.

Also add a one-line muted note inside the rate-plan card near the Price field (or directly under the rate-plans header) repeating: "Match your OTA price, or go lower — never higher."

### 5. "Where else is this listed?" — required, not optional — `src/routes/business.deals.$id.edit.tsx`
- Remove the `<details>` wrapper so the section is always expanded.
- Promote it to a real `<section>` matching the Basics / Rooms / Calendar sections.
- Drop the "(optional)" tag.
- New heading: "Where else is this listed?"
- New helper copy: "Pin your listing URL on every OTA you're on. Our price-match scanner uses these to compare like-for-like and protect your rate parity. If you're only on Travidz, you can skip this."

Soft-required: not blocking save/publish (operators truly only on Travidz exist), but visually treated as a required step — no "(optional)" chip, sits above the publish button, and shows a subtle amber hint badge ("Recommended for OTA listings") when empty. No backend validation change.

### Out of scope
- No DB / server function changes.
- No changes to publish gates or the bookable status backend.
- No changes to `business.deals.new.tsx` (it just bootstraps a draft).
