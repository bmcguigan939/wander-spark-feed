
# Plan — E, F, G, H

Four independent slices, ordered so each is testable on its own. I'll ship them in this order and confirm after each.

---

## E. Search filters (Section 5)

Make `/search` faceted using columns that already exist on `videos` (`country`, `city`, `activity_tags`, `budget_tag`).

**UI** (`src/routes/search.tsx`)
- Keep existing text input.
- Add a horizontal chip row under the input with 4 filter sheets: Country, Activity, Budget, Sort.
- Selected chips show a count; tap clears.
- Results re-fetch on any change.

**URL state**
- Use `validateSearch` + `zodValidator` so filters live in the URL and are shareable:
  - `q: string`, `country?: string`, `tags: string[]`, `budget?: "$"|"$$"|"$$$"`, `sort: "new" | "popular"`
- `Link`/`useNavigate` use the function form to preserve other params.

**Server** (`src/lib/feed.functions.ts` → add `searchVideos`)
- `supabaseAdmin.from("videos").select(...).eq("status","ready")` with optional `eq("country",...)`, `contains("activity_tags",[...])`, `eq("budget_tag",...)`, and `textSearch("search_tsv", q, { type: "websearch" })` when `q` is set.
- Sort: `created_at desc` or `like_count desc`.
- Returns `{ videos, facets }` where `facets` are top 12 countries + top 20 tags computed from a second lightweight query (cached 60s in-memory per process).

**Test**
- Apply each filter alone and combined; verify URL reflects state and refreshing keeps results.

---

## F. Tracking links + QR for approved deal applications (Section 11 tail)

Closes the monetisation loop opened in B.

**DB migration**
- New table `deal_redirects`:
  - `code text primary key` (the `approved_code`, uppercased)
  - `deal_id uuid not null`, `creator_id uuid not null`, `created_at`
  - unique index on (`deal_id`, `creator_id`)
- Trigger on `deal_applications`: when `status` transitions to `approved` and `approved_code` is set, upsert a row into `deal_redirects`.
- RLS: public SELECT (codes are public); writes via trigger / service role only.

**Public redirect route**
- `src/routes/r.$code.tsx` (page route, NOT under `/api/public/`).
- Loader calls a server fn `resolveRedirect({ code })` that:
  1. Looks up `deal_redirects` → `deals.url`.
  2. Inserts a `deal_clicks` row with `deal_id`, `user_id` (if signed in), and a synthetic `referrer_video_id = null`, plus a new nullable `creator_id` column so we can attribute clicks per creator.
  3. Returns `{ url }`.
- Component renders "Redirecting…" then `window.location.replace(url)`.

**Creator UI**
- On `/creator/applications`, each approved row already shows the code. Add:
  - "Copy link" button → `https://<origin>/r/<CODE>`.
  - "QR" button → opens a sheet with the QR code (use `qrcode` npm package, render to `<canvas>`).
- On `/creator/analytics`, add a "Deal clicks" card aggregating `deal_clicks` where `creator_id = me`.

**Test**
- Approve an application → creator copies link → open in incognito → lands on `deals.url`, `deal_clicks` row exists, click count increments on `/business/deals/$id`.

---

## G. AI itinerary builder (Section 14)

Uses the AI tags from C and Lovable AI (no extra keys).

**DB migration**
- `itineraries`: `id`, `user_id`, `title`, `destination`, `country`, `city`, `days int`, `interests text[]`, `budget_tag`, `summary text`, `plan jsonb` (array of day objects), `created_at`.
- RLS: owner-only CRUD; optional `is_public` later.

**Server** (`src/lib/itinerary.functions.ts`)
- `generateItinerary({ destination, days, interests, budget })`:
  1. Pulls up to 30 matching videos (`textSearch` on destination + tag overlap).
  2. Calls `google/gemini-3-flash-preview` via Lovable AI Gateway with a JSON-schema response asking for `{ summary, days: [{ title, morning, afternoon, evening, video_ids: [] }] }` and feeds in the candidate video titles/ids/tags.
  3. Persists to `itineraries` and returns the row.
- `listMyItineraries`, `getItinerary`, `deleteItinerary`.

**UI**
- `src/routes/itineraries.index.tsx` — list + "New itinerary" button.
- `src/routes/itineraries.new.tsx` — form (destination, days slider 1–14, interests multiselect from a curated tag list, budget chips). Shows skeleton while AI runs.
- `src/routes/itineraries.$id.tsx` — day-by-day cards, each linking to referenced videos via `/?v=<id>`.
- Entry points: card on `/profile` and "Plan a trip" button on `/destinations/$country/$city`.

**Test**
- Generate for a destination that has videos; verify referenced video ids are real; refresh persists; delete works.

---

## H. Map view (Section 16) — requires Mapbox token

**Secret**
- Add `MAPBOX_PUBLIC_TOKEN` (publishable, safe in client). I'll request it via `add_secret` before writing the client code.

**DB**
- Add nullable `lat double precision`, `lng double precision` to `videos` and `deals`. Backfill via the AI tagging step (extend `runAutoTag` in a follow-up; for now we accept manual lat/lng in `/create` and `DealForm`).

**UI**
- `src/routes/map.tsx`: full-screen `react-map-gl` (or `mapbox-gl` directly) map.
  - Toggle pills: Videos / Deals / Both.
  - Cluster markers; click opens a bottom sheet with the video card or deal card.
  - URL-state for `lng`, `lat`, `zoom`, `layer` via `validateSearch` so links are shareable.
- Add "Map" entry to bottom nav (replaces nothing — likely a secondary action on Search).

**Test**
- Pins appear for videos/deals with coords; clusters split on zoom; bottom sheet opens; deep link reopens at same view.

---

## Technical notes (per-slice scope)

- Each slice ships with its own migration where needed; types regenerate automatically.
- All new server fns use `requireSupabaseAuth` except `resolveRedirect` (public; rate-limited only by Postgres/Lovable defaults).
- New routes follow the existing flat-dot naming convention; no edits to `routeTree.gen.ts`.
- Reuses existing components (`MobileShell`, `VideoCard`, `DealCard` where present) — no design system changes.

---

## Order & checkpoints

1. **E** ships first (smallest, no new deps, no secrets). I'll stop and ask you to test before moving on.
2. **F** next (adds `qrcode` dep, one migration, one public route).
3. **G** after that (one migration, Lovable AI call).
4. **H** last (needs Mapbox token from you; adds `mapbox-gl`).

Reply approve to proceed with **E first**, or tell me to start at a different slice.
