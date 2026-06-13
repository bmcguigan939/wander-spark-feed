## Goal

Make the channel manager step actually manage bookings. Today `business_channel_feeds` is written by the setup wizard but never read. This plan wires those feeds into the existing per-deal availability system, gives owners a dashboard card to manage them, surfaces per-deal outbound `.ics` URLs so a channel manager can pull Travidz bookings, and adds per-feed sync status/error surfacing.

## Scope

### 1. Backend sync: fan business feeds into per-deal blocks

Reuse the existing `deal_blocked_dates` / `deal_external_calendars` machinery instead of inventing a parallel one — the booking UI, public read policies, and ICS generation already key off those tables.

**Schema (single migration):**
- `business_channel_feeds`: add `label` already exists; add `last_synced_at timestamptz`, `last_status text`, `last_error text`, `last_blocked_count int`. Fix the FK: it currently references `auth.users(id)` but should logically reference the owner; keep as-is (owner = `auth.uid()`), just document.
- `deal_external_calendars`: add nullable `business_feed_id uuid references business_channel_feeds(id) on delete cascade` + index. When set, the row is a managed mirror of a business feed (owner UI hides it from per-deal editor; sync is driven by the business feed).
- Add unique partial index `(deal_id, business_feed_id)` where `business_feed_id is not null` so we don't double-attach.

**New server logic (`src/lib/calendar-sync.server.ts`):**
- `syncBusinessFeed(feedId)`: fetch feed once, expand to dates once, then for every deal owned by `feed.business_id` ensure a `deal_external_calendars` row exists with `business_feed_id = feedId` and `ics_url = feed.feed_url`, and replace that calendar's `deal_blocked_dates` rows with the expanded set. On feed deletion the cascade removes the mirror calendars and their blocks. Update `last_synced_at/last_status/last_error/last_blocked_count` on the feed row.
- Cleanup pass inside the same function: when a deal is added later, the next sync creates its mirror; when a deal is removed/archived, the mirror cascades from `deals` delete and `last_status` stays consistent.

**Cron hook (`src/routes/api/public/hooks/sync-external-calendars.ts`):**
- After existing per-deal loop, also `select id from business_channel_feeds` and call `syncBusinessFeed` for each. Aggregate counts in the response.

### 2. Owner-facing server functions (`src/lib/business-channel-feeds.functions.ts`, new)

All `.middleware([requireSupabaseAuth])`, scoped to `business_id = userId`:
- `listMyChannelFeeds()` → feeds + sync status + affected deal count.
- `addMyChannelFeed({ label?, feed_url })` → insert, then immediately call `syncBusinessFeed`.
- `updateMyChannelFeed({ id, label?, feed_url? })` → update, re-sync if URL changed.
- `removeMyChannelFeed({ id })` → delete (cascade removes mirror calendars/blocks).
- `syncMyChannelFeedNow({ id })` → run `syncBusinessFeed` and return summary.
- `listMyDealIcalUrls()` → for each owned deal, return `{ dealId, title, feedUrl }` built from the same token logic used by `DealCalendarSync` (centralize the token builder in a shared server-only helper if not already).

Replace the existing `getMyChannelFeeds` in `business-setup.functions.ts` with `listMyChannelFeeds` (or have setup call the new fn) to avoid duplication. Setup wizard saves go through the new add/update fns so newly entered feeds sync immediately rather than waiting for cron.

### 3. Dashboard card (`src/components/business/ChannelManagerCard.tsx`, new)

Rendered on `business.index.tsx` (and linked from `OnboardingChecklist` as "Connect channel manager" if not yet set). Mirrors `DealCalendarSync` look-and-feel but operates at business scope:

- **Header:** "Channel manager" + provider badge (from `profiles.channel_manager_provider`), with an "Edit provider" inline action.
- **Section A — Feeds you're importing:** list `business_channel_feeds` with label, truncated URL, last-sync relative time, status pill (ok / error / pending), affected deal count, per-row "Sync now" and "Remove" buttons. Add form for label + URL. Uses the new server fns via `useMutation` + query invalidation on key `["business-channel-feeds"]`.
- **Section B — Outbound calendar URLs (per deal):** list each of the owner's deals with the public `.ics` URL and Copy button, plus a "Bulk copy as CSV" action so they can paste into their channel manager's "Add iCal" screen. Empty state when the owner has no published deals yet.
- **Footer:** "Sync runs automatically every hour. Last automatic run: …" (read from max `last_synced_at` across feeds).

### 4. Setup wizard adjustments (`src/routes/business.setup.tsx`)

- After Step 5 saves feeds, trigger an immediate sync (server fn already does it) and surface inline status ("Connected · N dates blocked across M deals" or error).
- "Manage later from your dashboard" link goes to `/business#channel-manager`.

### 5. Out of scope

- Real provider OAuth (SiteMinder/Cloudbeds API) — still iCal only.
- Per-feed deal allow-list (all owner's deals are mirrored by default).
- Rate-plan / pricing sync — availability only.
- Editing the provider list (stays as fixed dropdown from setup).

## Technical notes

- Use existing `expandIcsToDates` and the replace strategy from `syncOneExternalCalendar`; factor the shared inner body into a helper that takes `{ calendarId, dealId, icsUrl }` so per-deal and per-business paths share code.
- Mirror calendars created by `syncBusinessFeed` get `name = feed.label ?? 'Channel manager'` so `DealCalendarSync` shows them but the existing remove button on those rows should be disabled when `business_feed_id is not null` (managed centrally). Add a small UI guard there.
- Cron route stays at `/api/public/hooks/sync-external-calendars`; no new cron job needed.
- All new RLS policies on `business_channel_feeds` columns are already covered by the existing owner policy; the new `business_feed_id` column on `deal_external_calendars` doesn't change policy semantics (existing per-deal owner policies still apply).
- Public read of `deal_blocked_dates` already works for the outbound `.ics`, so no change for the consumer side.

## Files

```text
supabase/migrations/<new>.sql            (schema additions + index)
src/lib/calendar-sync.server.ts          (add syncBusinessFeed, refactor shared body)
src/routes/api/public/hooks/sync-external-calendars.ts  (also iterate feeds)
src/lib/business-channel-feeds.functions.ts             (new server fns)
src/lib/business-setup.functions.ts      (delegate feed CRUD to new fns; immediate sync on save)
src/components/business/ChannelManagerCard.tsx          (new)
src/components/business/DealCalendarSync.tsx            (disable remove on managed rows)
src/components/business/OnboardingChecklist.tsx         (link to dashboard card if not set)
src/routes/business.index.tsx            (mount the card with #channel-manager anchor)
src/routes/business.setup.tsx            (post-save status + dashboard link)
```
