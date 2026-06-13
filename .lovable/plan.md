## Goal

When the user picks "Yes" in **Step 5 — Do you use a channel manager?**, surface a connect sub-step where they pick their provider and paste one or more iCal sync URLs. "No" continues straight to Step 6 (facilities) unchanged. Total step count stays at 16 — the connect screen is an inline sub-view of Step 5, not a new top-level step (so the existing branching switch for Activity doesn't shift).

## What the user sees

Stays path, Step 5 becomes two views inside the same step:

1. **View A — "Do you use a channel manager?"** (current cards). Copy change:
   - "Yes — I'll connect it now" (was "Yes — I'll connect mine later")
   - "No, I won't use a channel manager"
   On "Continue":
   - If **Yes** → save `channel_manager_planned: true` and switch to View B in place; **do not** advance to Step 6.
   - If **No** → save `false` and advance to Step 6 as today.
2. **View B — "Connect your channel manager"** (only when Yes was picked):
   - Provider dropdown: SiteMinder, Cloudbeds, Hostaway, Lodgify, Smoobu, Beds24, Hostfully, Other (free text field appears when "Other" chosen).
   - Repeating list of "Calendar feed URL" rows (start with one, "+ Add another feed"), each with an optional label (e.g. "Airbnb", "Booking.com"). At least one row must have a valid URL (`https://…` or `webcal://…`, max 500 chars) to enable Continue.
   - Helper text + a "How do I find this?" disclosure that lists the per-provider menu paths (short bullets, no external links needed).
   - Footer buttons: **Back** (returns to View A, leaves data intact), **Skip for now** (saves what's entered, marks `channel_manager_connect_skipped_at = now()`, advances), **Continue** (saves URLs + advances).
   - On Continue, persist via a new server function (see below), invalidate setup state, then `next()`.

Activity path is unchanged (no channel-manager step there today).

## Data

New columns on `profiles`:
- `channel_manager_provider text` — provider key (e.g. `siteminder`, `other`)
- `channel_manager_provider_other text` — free-text when provider is `other`
- `channel_manager_connect_skipped_at timestamptz`

New table `business_channel_feeds` (one row per iCal URL):
- `id uuid pk default gen_random_uuid()`
- `business_id uuid references auth.users(id) on delete cascade`
- `label text` (nullable, e.g. "Airbnb")
- `feed_url text not null` (CHECK length ≤ 500)
- `created_at`, `updated_at` (with updated_at trigger)
- Unique `(business_id, feed_url)`

Migration includes the standard four-step pattern: CREATE TABLE → GRANT (`authenticated` full, `service_role` all; no `anon`) → ENABLE RLS → policies: a business may select/insert/update/delete only rows where `business_id = auth.uid()`; admins may select all via `has_role(auth.uid(),'admin')`.

## Server fns (`src/lib/business-setup.functions.ts`)

- Extend `saveSetupChannelManager` input to:
  `{ channel_manager_planned: boolean, provider?: string|null, provider_other?: string|null, feeds?: { label?: string|null, feed_url: string }[], skipped?: boolean }`.
  Handler:
  1. Always update `profiles.channel_manager_planned` (and provider fields + `channel_manager_connect_skipped_at` when supplied).
  2. If `feeds` is provided, replace the user's `business_channel_feeds` rows in one transaction (delete existing rows for this user, insert provided ones — keeps the editor idempotent).
  3. Bump setup step to 5 only when advancing (when `planned === false` or feeds/skipped is supplied); when just saving the "Yes" choice without feeds yet, leave the step where it is.
- New `getMyChannelFeeds` server fn to hydrate View B on revisit.

Validation: feed URLs parsed with `z.string().url()` plus an allowlist of protocols (`https:`, `http:`, `webcal:`). Cap feeds at 10.

## Frontend (`src/routes/business.setup.tsx`)

- Split `Step5ChannelManager` into a small wrapper state machine: `view: "ask" | "connect"`, default `"ask"`.
- Picking "Yes" + Continue saves the boolean (and provider when set later), then setView("connect"). Existing wizard "Back" button in View B returns to View A without leaving the step.
- View B renders the provider select, feed-URL editor (reuse existing `Field` and input styling from `Step5ChannelManager`/`Step6Facilities` to match the visual language; no new component file unless this exceeds ~120 lines).
- Hydrate initial state from `profile.channel_manager_provider`, `provider_other`, and a new query against `getMyChannelFeeds`.
- "Skip for now" sets `skipped: true`, advances; the dashboard onboarding checklist (out of scope here) can later prompt them to finish.

No changes to step count, the activity branch, or other steps.

## Out of scope

- Real OAuth/API integration with any channel manager (this is iCal feeds only; same primitive already used at the deal level).
- Background sync scheduling — feeds are stored now, sync wiring can be a follow-up.
- Dashboard "Connect channel manager" card.

## Steps to execute (after approval)

1. Run migration: add three profile columns, create `business_channel_feeds` table with GRANT/RLS as above.
2. Update `saveSetupChannelManager` and add `getMyChannelFeeds` in `business-setup.functions.ts`; expand the selected `profiles` column list to include the new fields.
3. Refactor `Step5ChannelManager` in `business.setup.tsx` to the two-view flow with the provider/feed editor.
4. Manual QA in preview: Yes → connect view → save feeds → next; Yes → skip → next; No → next; revisit Step 5 and confirm feeds reappear.
