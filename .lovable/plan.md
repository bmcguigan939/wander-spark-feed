# TheFork affiliate integration

## What TheFork actually pays for
TheFork (Tripadvisor company) runs its affiliate program through **Awin**, not a direct API. Publishers earn ~€1–2 per seated diner. There is no public booking API — monetisation is done by deep-linking users from our app to `thefork.com` wrapped in an Awin tracking URL.

Format (per Awin docs):
```
https://www.awin1.com/awclick.php?mid=15103&id=<AWIN_PUBLISHER_ID>&clickref=<our-click-id>&p=<URL-encoded thefork.com link>
```
- `mid=15103` is TheFork's Awin merchant ID (constant).
- `id` is **your** Awin publisher ID — required before any of this earns money.
- `clickref` is our own tracking token, surfaced back in Awin reports so we can attribute commissions to a user / deal / city.
- `p` is the destination on TheFork (a specific restaurant page if we have one, otherwise a city search).

## Prerequisites (user action)
1. Sign up at awin.com as a publisher (free).
2. Apply to the **TheFork (LaFourchette)** programme inside Awin → wait for approval.
3. Provide us your numeric **Awin publisher ID** — we'll store it as a runtime secret `AWIN_PUBLISHER_ID`.

I'll request that secret after you approve the plan.

## Implementation

### 1. Schema (migration)
Add restaurant booking metadata to businesses + a clicks log we can reconcile with Awin reports.

- `profiles.thefork_url text` — optional, the restaurant's own page on thefork.com (e.g. `https://www.thefork.com/restaurant/cervejaria-ramiro-r123456`). Businesses paste this in their profile.
- `profiles.is_restaurant boolean default false` — flag so the CTA only renders for restaurant pins. (Cheap; later we can derive from a proper `business_category` enum.)
- New table `partner_clicks`:
  - `id`, `created_at`, `user_id` (nullable), `partner` text (`'thefork'`), `business_id` (nullable), `deal_id` (nullable), `city` text (nullable), `click_ref` text unique, `destination_url` text.
  - RLS: insert allowed for anyone (including anon — clicks come from logged-out travellers too); select restricted to admins via `has_role`.

### 2. Affiliate link builder (`src/lib/affiliates/thefork.ts`)
Pure helper, client-safe:
```ts
buildTheForkUrl({
  destination: string;          // specific restaurant page or city search URL
  publisherId: string;
  clickRef: string;
}): string
```
- If destination is a `thefork.com` URL → wrap with awin1.
- If only city given → build a city search URL like `https://www.thefork.com/search/?cityId=…` (we store a tiny lookup of city → TheFork URL slug for the cities we already seed; fallback to a global search).

### 3. Server function (`src/lib/affiliates.functions.ts`)
`createTheForkClick({ business_id?, deal_id?, city? })`:
- Reads `process.env.AWIN_PUBLISHER_ID` inside handler.
- Picks the destination URL (business `thefork_url` if present, else city-search fallback).
- Generates a short `click_ref` (nanoid), inserts a `partner_clicks` row (with user_id from `requireSupabaseAuth` middleware if signed in, else anon).
- Returns the fully-built Awin URL.

Why server-side: keeps the publisher ID out of the bundle and lets us attribute the click to the authenticated user.

### 4. UI — CTA in ClusteredSheet "About" tab
In `src/components/map/ClusteredSheet.tsx`, for each business with `is_restaurant = true`, render a primary "Book a table on TheFork" button next to the existing profile link. On click:
- Call `createTheForkClick({ business_id })` → open returned URL in a new tab.
- Falls back to a disabled state with tooltip "Booking link coming soon" if business has no `thefork_url` AND no city fallback exists.

Also add a generic "Find restaurants on TheFork" footer to the **Eat** category view when no specific business is selected (uses the current map city as the destination).

### 5. Business profile form
Add a single text input "TheFork restaurant URL" + an "Is restaurant" toggle to the business profile editor (`/business`) so owners can self-serve.

### 6. Seed
Mark one of our two seeded businesses (Lisbon) as a restaurant with a sample TheFork URL so we can click through end-to-end immediately.

## Out of scope (deliberately)
- Awin XML feed ingestion (auto-importing 50k+ restaurants). Possible later but adds complexity; better once we know the program converts.
- Server-to-server commission reconciliation. Awin reports are downloaded weekly; we'll add a CSV importer once revenue starts.
- OpenTable / Resy. Same pattern, easy to add later — the `partner` column is already generic.

## Files touched
- new: `supabase/migrations/<ts>_thefork_affiliate.sql`
- new: `src/lib/affiliates/thefork.ts`
- new: `src/lib/affiliates.functions.ts`
- edit: `src/components/map/ClusteredSheet.tsx` (CTA)
- edit: `src/routes/business.index.tsx` + profile form (new fields)
- edit: `src/lib/businesses.functions.ts` (persist new fields) — if it exists; otherwise inline
- runtime secret request: `AWIN_PUBLISHER_ID`

## Test plan
1. Run migration → confirm `types.ts` shows new columns.
2. Seed Lisbon business with a sample TheFork URL.
3. From `/map`, open Lisbon cluster → About tab → click "Book a table" → opens awin1.com → 302s to TheFork. Verify `partner_clicks` row landed with a `click_ref`.
4. Edit business profile → save TheFork URL → re-test.
