
# Booking.com-style onboarding wizard + booking page

Two big pieces, designed to slot into what's already built (DealForm, RoomsAndRatesEditor, BusinessPhotosEditor, PayoutMethodCard, DealCalendarSync, rate plans, blocked dates, Stripe Connect, price-match, etc.). Nothing existing gets removed — the wizard wraps it; the booking page redesigns the traveller-facing surface.

## Part A — Business setup wizard

A single new route `/business/setup` that drives a 14-step flow with progress bar, Back/Continue, autosave-as-you-go, and resumes where you left off. Existing standalone pages (`/business/photos`, `/business/onboarding/payout`, `/business/deals/new`) keep working for editing later.

Branches based on property type chosen at step 3:

```text
type ──┬─ Apartment ───────► single OR multi-apartment subflow (same/different address)
       ├─ Homes ───────────► entire-place subflow (villa, holiday home)
       ├─ Hotel/B&B ──────► rooms-and-rates subflow (multi-room types, per-room rates)
       └─ Alternative ────► single-unit lightweight subflow (boat, campsite, tent)
```

### Steps (mirrors the PDF)

1. **Property type** — 4-tile picker; sets `setup_property_kind` on profile.
2. **Count & layout** — "one / multiple", "same address?" if multi (apartments/homes only). Hotels skip.
3. **OTA import** — "Where else is your property listed?" (Airbnb, Vrbo, Expedia, Hotels.com, TripAdvisor, none). Just captures URLs into `profiles.ota_listings jsonb` for now; actual import is a no-op stub with a "we'll process this" message (real scrape is out of scope).
4. **Address** — quick-search (uses existing geocoder if present, else free-text + lat/lng manual) + map confirm. Reuses `BusinessLocationPrompt` patterns.
5. **Channel manager** — yes/no toggle → `profiles.channel_manager_planned bool`. Yes shows a "we'll wire this after you finish" note.
6. **Facilities** — chip multiselect (WiFi, AC, pool, etc.) → `profiles.facilities text[]`.
7. **Services** — breakfast (yes/no), parking (free/paid/no) → columns on profile.
8. **Languages** — multiselect → `profiles.languages_spoken text[]`.
9. **Host profile** — display name, "about you", "about the neighbourhood" → fills `profiles.display_name`, `bio`, new `profiles.neighbourhood_blurb`.
10. **Booking model** — instant vs request-to-book → `profiles.default_booking_model text` and applied to new deals.
11. **Payments** — "online via Travidz" (default) + optional "pay at property" toggle, kicks `PayoutMethodCard` / Stripe Connect onboarding.
12. **First unit** — branch:
    - Apartment/Home/Alternative: "Set up your first apartment" → reuses `DealForm` in a slimmed inline mode (title, beds/bathrooms, guests, amenities-per-unit, photos via `BusinessPhotosEditor`).
    - Hotel/B&B: opens `RoomsAndRatesEditor` inline to add the first room type + rates.
13. **Photos** — at least 5, drag-drop. Reuses `BusinessPhotosEditor` with the "≥5" gate from PDF.
14. **Pricing & policies** — per-night price, group-size pricing toggle, cancellation policy code (existing `cancellation_policy_code` enum), 30+ night stays toggle → `profiles.long_stays_enabled bool`.
15. **Legal entity** — Individual vs Business; if Business, capture entity name/email/phone → `profiles.legal_entity_type`, `legal_entity_name`, `legal_contact_email`, `legal_contact_phone`. Locks behind the existing Business Agreement.
16. **Go live** — review summary; "Open for bookings" sets the first deal `is_active = true` and `status = 'approved'`; "I'm not ready" keeps it draft.

### UX shell

- Sticky top progress bar (`Step n / 16`), sticky bottom Continue/Back, side "Need help?" link.
- Each step persists on Continue via a new `upsertSetupStep` server fn; if the user closes mid-flow, returning to `/business/setup` jumps to the first incomplete step (tracked via `profiles.setup_step_completed int` and `profiles.setup_completed_at`).
- `OnboardingChecklist` on `/business` gets a "Resume setup" CTA when setup is incomplete.

## Part B — Booking.com-flavoured booking page

Redesign `/book/$dealId` (and the read-only deal preview at `/deals/$id`) into a single-column mobile-first layout that feels like Booking.com:

```text
┌───────────────────────────────────────┐
│  Photo gallery (swipe, "+N photos")   │
├───────────────────────────────────────┤
│  Title · ★rating · location · map pin │
│  Verified badge · cancellation chip   │
├───────────────────────────────────────┤
│  Property highlights (chips)          │
│  WiFi · Free cancel · Pay at property │
├───────────────────────────────────────┤
│  About this place (description)       │
│  Neighbourhood blurb                  │
├───────────────────────────────────────┤
│  Amenities grid (icons)               │
├───────────────────────────────────────┤
│  Choose your room / rate              │
│  (existing RateSelector restyled into │
│   Booking.com "table-row + Select"    │
│   cards; per-rate cancellation,       │
│   breakfast, deposit pill)            │
├───────────────────────────────────────┤
│  Guest reviews (RatingSummary +       │
│  top 3 review excerpts)               │
├───────────────────────────────────────┤
│  House rules & policies               │
├───────────────────────────────────────┤
│  Meet your host (avatar, name, bio)   │
├───────────────────────────────────────┤
│  Sticky bottom bar:                   │
│   £xx total · "Reserve" / "Request"   │
└───────────────────────────────────────┘
```

Behaviour:
- Date picker + guest stepper live in a slide-up sheet triggered by "Reserve"; selection persists in URL search params (already supported).
- Blocked dates fed from existing `getBlockedDates`.
- Price-match badge stays.
- "Instant book" vs "Request to book" CTA depends on the deal's booking model (from step 10).
- If the user opened the page from a video clip (`?v=`), a small "via @creator" credit pill appears at the top.

The old book screen logic (Stripe embedded checkout, pay-at-property, return URL) is reused as-is — only the chrome around it changes.

## Part C — Backend changes

One migration adds the fields the wizard needs and a couple of supporting tables. All new columns are nullable / defaulted so nothing breaks for existing users.

`profiles` adds:
- `setup_property_kind text` (`apartment` | `home` | `hotel` | `alternative`)
- `setup_unit_count int`, `setup_units_same_address bool`
- `setup_step_completed int default 0`, `setup_completed_at timestamptz`
- `ota_listings jsonb default '[]'` (array of `{source, url}`)
- `channel_manager_planned bool default false`
- `facilities text[] default '{}'`
- `breakfast_offered text` (`no` | `yes_free` | `yes_paid`), `parking_offered text`
- `languages_spoken text[] default '{}'`
- `neighbourhood_blurb text`
- `default_booking_model text default 'instant'` (`instant` | `request`)
- `pay_at_property_enabled bool default false`
- `long_stays_enabled bool default true`
- `legal_entity_type text` (`individual` | `business`), `legal_entity_name text`, `legal_contact_email text`, `legal_contact_phone text`

`deals` gets:
- `booking_model text default 'instant'` (defaults from profile at create time)

New server fns in `src/lib/business-setup.functions.ts`:
- `getMySetupState` (auth, returns profile + first deal + step pointer)
- `saveSetupStep` (auth, validates step payload with Zod, writes only the columns for that step)
- `markSetupComplete` (auth, sets `setup_completed_at`, optionally activates first deal)

All use `requireSupabaseAuth`; RLS already covers `profiles` for self-update.

No changes to existing rate plans / rooms / photos schemas — the wizard calls into the same editors.

## Out of scope (this round)

- Real OTA import (Expedia/Airbnb scraping). Step 3 stores URLs only.
- Real channel-manager (Cloudbeds, SiteMinder) integrations. Captures intent only.
- Two-column desktop booking layout — single-column mobile-first per your answer.
- Translating the host profile to other languages.
- Replacing existing `/business/deals/new` standalone form — it stays for power users editing later.

## Rollout

1. Migration for new profile/deal columns.
2. New `business-setup.functions.ts` + step Zod schemas.
3. `/business/setup` route + `WizardShell` + 16 step components (reusing existing editors inside steps 12 and 13).
4. "Resume setup" entry on `/business` and redirect from `/business/apply` after activation.
5. Redesign `/book/$dealId` page chrome + restyle `RateSelector` rows; add bottom reserve bar and date/guests sheet.
6. Smoke: create new business → walk full wizard → list deal → book it as a different user.
