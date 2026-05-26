## Goal
Finish the deferred work so an activity operator (or hotel) can complete the entire setup in one sitting without ever guessing what to do next. Today the dashboard says "Property photos", the deal editor shows "Add a room" + "Breakfast" to dive masters, and every onboarding link dumps the user on `/business` and expects them to scroll. We fix that.

The single source of truth is `BookableStatus.accountKind` (added last turn). Every business-side surface should read it once and render kind-aware copy + fields.

---

## Phase 1 — Plumb `accountKind` everywhere (copy + smart routing, no schema)

### 1a. New hook `src/lib/useAccountKind.ts`
- Wraps `useQuery(["bookable-status", user.id], getBookableStatus)` (same key the checklist already uses, so it dedupes).
- Returns `"stay" | "activity" | "unknown"`, defaulting to `"unknown"` while loading.
- Used by every component below so we don't prop-drill.

### 1b. `GATE_LINKS` becomes dynamic
- Replace the static `GATE_LINKS` constant with `useGateLinks()` in `src/lib/bookable.functions.ts` (constant stays exported as a fallback used by the SSR/sitemap path; the checklist switches to the hook).
- Resolution:
  - `photos` → `/business#photos` (BusinessPhotosEditor already has `id="photos"`).
  - `items` / `rates` / `calendar` → first deal's `/business/deals/$id/edit` (#rooms, #rates, #calendar anchors added). If no deals yet, → `/business/deals/new`.
  - `payouts` → unchanged.
- Add `id="rooms"`, `id="rates"`, `id="calendar"` anchors to `RoomsAndRatesEditor` and `DealCalendarSync`.
- Checklist already scrolls via Link; add `scrollMargin` so the section lands below the sticky header.

### 1c. `OnboardingChecklist`
- Replace `GATE_LINKS[gate]` with `useGateLinks()[gate]`.
- When `bookable === true`, instead of hiding, collapse into a single "You're bookable — preview your live page" card with a Preview link.

### 1d. `business.index.tsx`
- Read kind once: `const kind = useAccountKind()`.
- Pass `<BusinessPhotosEditor businessId={user.id} kind={kind === "activity" ? "activity" : "stay"} />`.
- The big "No deals yet" empty-state CTA copy branches: "Publish your first deal" → "Publish your first activity package" / "Publish your first stay".

### 1e. `BusinessPhotosEditor`
- Heading: `"Property photos"` → `"Activity photos"` when `kind === "activity"`.
- Default category on upload: today hardcoded `"other"`. New default: `"location"` for activity, `"exterior"` for stay.
- Helper copy updates to match (already partly done).

### 1f. `DealForm`
- Smart default `category`: when this form mounts for a brand-new deal AND `accountKind === "activity"`, default to `"do"` instead of `"other"`. (For edit flows, keep the deal's saved category.)
- Hide hotel-only fields when category is not `"stay"`: `parity_exempt` toggle moves under a "Advanced" details disclosure (still available, just not in the main flow), and the "Discount label" stays.
- Keep the operator-markup block as-is (functional + tested).

### 1g. `PayoutMethodCard`
- Today `startConnectOnboarding({ country: "GB" })` is hardcoded. Read `business_country` from the profile (already on `profiles`) and pass it; fall back to `"GB"` if unset.
- Add a small "What you'll need" pre-flight list (2 mins, business legal name, ID, bank account) above the "Connect bank with Stripe" CTA so operators don't bounce mid-flow.
- No logic change to the gate or commission math.

---

## Phase 2 — Make `RoomsAndRatesEditor` activity-friendly (additive schema)

This is the heaviest item. We keep the table name (`deal_rooms`) — the bookable trigger reads from it — and add the activity-relevant columns as nullable. UI branches by `category`.

### 2a. Migration (additive only)
```
ALTER TABLE public.deal_rooms
  ADD COLUMN duration_minutes integer,
  ADD COLUMN min_group_size  integer,
  ADD COLUMN max_group_size  integer,
  ADD COLUMN includes        text[] NOT NULL DEFAULT '{}',
  ADD COLUMN excludes        text[] NOT NULL DEFAULT '{}',
  ADD COLUMN meeting_point   text;
```
All nullable / defaulted, so existing rooms and the bookable trigger don't change.

### 2b. `rooms-rates.functions.ts`
- Extend the `upsertRoom` Zod schema to accept the new optional fields. No new gate.

### 2c. `RoomsAndRatesEditor`
- Branch on `category`:
  - Stay → unchanged.
  - Activity (`do` / `tour`) → render `<PackageCard>` instead of `<RoomCard>`. Headings: "Packages & rates", "Add a package", icon `Sparkles` instead of `Bed`. Fields: name, description, duration, min/max group size, includes (chip input), excludes (chip input), meeting point, photos (existing uploader reused). Rate plans render inside each package with current cancellation/payment/perks UI, but the "Breakfast" select is hidden for non-stay.
  - Other (`eat` / `transport` / etc.) → keep the flat rate-plans list (current non-stay branch).
- `LODGING_CATEGORIES` stays; add `ACTIVITY_CATEGORIES = new Set(["do","tour"])` for the new branch.

### 2d. Deal page rendering (out of scope this turn, follow-up)
- Surfacing duration / group size / includes on the public deal page is a separate UI pass once the editor lands. Data will be there waiting.

---

## Phase 3 — Smaller polish to reduce setup friction

### 3a. Onboarding "Done" detection
- `business.deals.$id.edit.tsx` currently shows a manual "Done — back to dashboard" button. Add a small live-updating banner at the top: "✓ This deal is now bookable" the moment all of (items, rates, calendar) for *this deal* are satisfied — using a per-deal version of `computeBookableStatus`. Same data, no new fetches if we lift it into the same query.

### 3b. Deep-link scroll target polish
- Each `id="…"` target gets `scroll-mt-20` so the sticky header doesn't cover it.

### 3c. Empty states everywhere read account-kind aware copy
- `RoomsAndRatesEditor` empty list for activity says "Add your first package (e.g. Half-day, Full-day, Private)" with click-to-add.
- `BusinessPhotosEditor` empty state for activity says "Add photos of your activity in action — group shots, equipment, location".

---

## Explicitly out of scope
- Public deal page redesign for activities (Phase 2d above).
- Stripe Connect commission, fee math, the gate logic, the `bookable` trigger.
- Removing or renaming `deal_rooms`. The trigger reads it — we extend, we don't rename.
- Migrating any existing rows (everything new is nullable / defaulted).

## Verification
- New activity operator: dashboard reads "Activity photos", checklist links go to `/business#photos`, `/business/deals/new`, etc. Creating a deal defaults to category=`do`. Editor shows "Packages & rates" with duration/group size/includes. Saving still flips `bookable=true` once all gates pass.
- Existing hotel: zero visible change. `accountKind === "stay"` returns the same labels, same fields, same links the user has today.
- Brand-new account with no deals: `unknown` → existing (stay-leaning) copy and links to `/business/deals/new`.
- Bookable trigger still fires on the same conditions because no gate field moved.