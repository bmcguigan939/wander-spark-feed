# Two-way iCal calendar sync for deals

Add iCal-based availability sync so businesses (and Travidz) never double-book a deal. Industry-standard approach used by Airbnb, Booking.com, Vrbo, etc.

## What businesses will see

In each deal's settings, a new **"Calendar sync"** section with:

1. **Your Travidz calendar URL** — a read-only `.ics` link they copy into their own website / Airbnb / Booking.com to import Travidz bookings.
2. **External calendars** — a list where they paste iCal URLs from their other booking sources (their own site, Airbnb, Booking.com, etc.). Each row shows: name, URL, last synced, # blocked dates, status (OK / error), Remove button.
3. **Status panel** — "Last poll: 8 min ago · Next: in 7 min · 14 dates blocked from external sources".

On the booking page, dates blocked by any external feed are greyed out and unselectable. Booking attempts on a blocked date return a clear error.

## Data model

New table `deal_external_calendars`:
- `deal_id` (FK → deals)
- `name` (e.g. "Airbnb", "My website")
- `ics_url`
- `last_synced_at`, `last_status` ("ok" | "error"), `last_error`
- `created_at`

New table `deal_blocked_dates`:
- `deal_id`
- `date` (DATE)
- `source` ("external_ical" | "travidz_booking" | "manual")
- `external_calendar_id` (nullable FK)
- `summary` (the iCal event title, for the audit log)
- Unique on (deal_id, date, source, external_calendar_id)

RLS: business owners can read/write their own; public can read `deal_blocked_dates` only for active deals (needed by the booking UI).

## Outbound feed (Travidz → others)

Public TSS route: `GET /api/public/ical/deal/$dealId.ics`
- No auth (iCal URLs are unguessable by convention; we use a per-deal random token in the path: `/api/public/ical/deal/$dealId/$token.ics`).
- Returns a valid `VCALENDAR` with one `VEVENT` per confirmed booking (`status IN ('confirmed','redeemed')`), using `travel_date` + `nights` (or single-day for non-stay deals).
- Cache headers: `Cache-Control: public, max-age=900` (15 min).

`deals` gets a new column `ical_token` (random, generated on first feed access).

## Inbound sync (others → Travidz)

Server route: `POST /api/public/hooks/sync-external-calendars` (cron, every 15 min).
- Reads all `deal_external_calendars` rows.
- For each: fetch the `.ics`, parse with the `ical.js` npm package, extract date ranges for the next 18 months, upsert into `deal_blocked_dates` (and delete rows no longer in the feed for that source).
- Records `last_synced_at`, `last_status`, `last_error`.

Manual "Sync now" button on each external calendar row hits the same logic for one row via a `createServerFn`.

## Booking flow integration

In `createBookingCheckout` (and the date picker on `book.$dealId.tsx`):
- Before allowing checkout, check `deal_blocked_dates` for the requested `travel_date` (and nights range). If any date is blocked, throw "These dates are no longer available".
- Date picker queries blocked dates for the next 12 months and disables them.

When a Travidz booking is confirmed (in the Stripe webhook), insert a `travidz_booking` row into `deal_blocked_dates` so the outbound feed picks it up on next refresh.

## Cron

One pg_cron job every 15 minutes calling `/api/public/hooks/sync-external-calendars` with the standard `apikey` header pattern.

## Honest limitations to surface in the UI

A short helper text under the calendar section:
> "iCal sync is near-real-time — typically 5–30 min lag depending on each platform. For very high-volume properties or last-minute bookings, dates may briefly appear available on multiple platforms."

## Technical notes

- Use `ical.js` (pure JS, Worker-compatible) for parsing — confirmed safe for the Cloudflare Worker runtime.
- All-day `VEVENT`s expand to inclusive start, **exclusive** end (iCal convention) — handle this carefully or off-by-one errors will block/unblock the wrong day.
- Polling fetches use a 10s timeout and skip the row on failure (don't fail the whole job).
- Audit log entry written on every block/unblock so businesses can see why a date became unavailable.

## Out of scope (future)

- Direct Google Calendar / Airbnb / Booking.com API (OAuth) integration — Plan C, only if hosts ask.
- Per-night pricing imported from external calendars.
- SMS/email alerts when sync fails for >24h (could add later).
