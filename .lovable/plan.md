## Goal

Turn `/map` from a static pin layer into a real travel-discovery surface: travellers can type a place ("Lisbon", "Bali"), filter by what they're looking for (stay / eat / do / tour), and tap any pin to see every affiliated business, deal and creator video tied to that location.

## What ships

### M1 — Search box with geocoding
- Add a search input pinned to the top of `/map` (replaces the current title bar).
- Two modes, switched by what the user types:
  - **Place search** (default): Mapbox Geocoding API (`mapbox.com/geocoding/v5/mapbox.places`) returns place suggestions; selecting one flies the map to that bbox and triggers a content refetch for the visible area.
  - **Content search**: when the user prefixes with `#` or hits a Content tab, query our DB (deals + videos + businesses) by text and pin the matches.
- Recent searches stored in localStorage.

### M2 — Category taxonomy
- New enum `deal_category`: `stay | eat | do | tour | transport | other`.
- Add `category deal_category` column to `deals` (default `other`, backfill heuristically from title — "hotel/villa/stay" → stay, "restaurant/cafe/bar" → eat, etc.; admin can refine).
- Filter chip row under the search box: All / Stay / Eat / Do / Tour. Updates URL `?cat=`.
- Apply the same filter to videos via existing `videos.tags` (map "stay"→`#hotel,#stay`, "eat"→`#food,#restaurant`, etc.).
- Add `category` to `DealForm` so businesses pick it on create/edit.

### M3 — Business pins (not just deals)
- Currently only deals/videos with `lat`/`lng` show. Add a third pin type: **business** (from `profiles` where `role=business` joined with the location they registered).
- Requires a `businesses_locations` view or two new columns on the business profile: `lat`, `lng`, `address`, `place_name`. Migration adds them to `profiles` (business-only, populated when a business first creates a deal or via a one-time location picker on `/business`).
- Business pins render only when a business has no current active deal in view (otherwise the deal pin wins to avoid double-pinning the same spot).

### M4 — bbox-aware loading + "Search this area"
- `getMapPins` already accepts `bbox`; wire the UI to pass it on `onMoveEnd` (debounced 350 ms).
- Add a small "Search this area" button that appears after the map is panned/zoomed > 1 km away from the last fetch, to make the refetch feel intentional.
- Raise the per-layer limit when bbox is provided (500 → 1000) and lower it when no bbox (avoid loading the whole planet).

### M5 — Clustered pin sheet (the "everything here" view)
- When pins are within ~30 m of each other (or all belong to the same `business_id`), render a single cluster pin with a count badge.
- Tapping a cluster opens the bottom sheet with three tabs: **Deals** · **Videos** · **About**:
  - Deals tab: list of deal cards (image, title, discount, "View deal →").
  - Videos tab: thumbnails of all creator videos at this location → deep link to feed.
  - About tab: business profile card (name, avatar, follow button, "View profile →").

### M6 — Free-text DB search
- New server fn `searchMapContent({ q, cat, bbox })` in `src/lib/map.functions.ts`:
  - ILIKE / pg_trgm on `deals.title`, `deals.description`, `profiles.display_name`, `videos.title`, `videos.tags`.
  - Returns the same `{ videos, deals, businesses }` shape so the map renders matches as pins; map auto-fits to results bbox if user came from a text query.

## Out of scope (parking lot)
- Google/Mapbox Places POI overlay (generic "things to do nearby" with no Travidz content) — would dilute the affiliate value prop.
- Saved searches / map alerts.
- Real-time pin updates (Realtime channel) — current 60 s `staleTime` is fine.
- Currency-aware price filtering on the map (lives on `/search` and deal pages already).

## Technical details

### Files touched
| File | Change |
|------|--------|
| `supabase/migrations/<ts>_map_categories_business_loc.sql` | New `deal_category` enum; `deals.category`; `profiles.lat/lng/address/place_name`; heuristic backfill of `deals.category`; pg_trgm indexes on `deals.title`, `profiles.display_name`, `videos.title`. |
| `src/lib/map.functions.ts` | Extend `getMapPins` to return `businesses` and accept `cat`. Add `searchMapContent({ q, cat, bbox })`. Add `geocodePlace({ q })` (server fn, calls Mapbox Geocoding with token from env to avoid CORS preflight noise). |
| `src/routes/map.tsx` | Replace top bar with search input + suggestion dropdown. Add category chip row. Wire bbox on `onMoveEnd`. Render business pins. Add clustering (simple grid-snap by lat/lng rounded to 4 dp; supercluster only if needed). Add clustered sheet with tabs (reuses `Sheet` + `Tabs` shadcn components). |
| `src/components/business/DealForm.tsx` | Add Category select. |
| `src/routes/business.tsx` or new `business.location.tsx` | One-time location picker (Mapbox geocoder → save lat/lng/address/place_name to profile). |
| `src/components/map/SearchBox.tsx` (new) | Reusable input + suggestions, debounced. |
| `src/components/map/CategoryChips.tsx` (new) | Stay / Eat / Do / Tour chips. |
| `src/components/map/ClusteredSheet.tsx` (new) | The 3-tab sheet. |

### Data model

```text
CREATE TYPE deal_category AS ENUM ('stay','eat','do','tour','transport','other');
ALTER TABLE deals ADD COLUMN category deal_category NOT NULL DEFAULT 'other';
ALTER TABLE profiles
  ADD COLUMN lat double precision,
  ADD COLUMN lng double precision,
  ADD COLUMN address text,
  ADD COLUMN place_name text;
CREATE INDEX deals_title_trgm ON deals USING gin (title gin_trgm_ops);
CREATE INDEX profiles_name_trgm ON profiles USING gin (display_name gin_trgm_ops);
```

### Mapbox token
Reuse the existing `pk.*` publishable token for both the map and the Geocoding API; no new secret needed. `geocodePlace` is a thin server fn so we can switch to a paid tier or swap providers later without touching the client.

### URL contract
`/map?lng&lat&zoom&layer&cat=stay&q=lisbon` — fully shareable / SEO-friendly.

## Execution order
M2 (schema + category) → M3 (business pins + profile location) → M1 (search box + geocoding) → M4 (bbox + "search this area") → M5 (cluster sheet) → M6 (DB text search).

## Open questions before I start
1. **Category list**: OK with `stay / eat / do / tour / transport / other`, or do you want a different cut (e.g. split `do` into `activity` and `attraction`)?
2. **Business location capture**: prompt businesses on next login with a one-time modal to set their address, or only require it next time they create a deal? (Existing deals will already have lat/lng on the deal row itself.)
3. **Geocoder provider**: Mapbox (free up to 100k req/mo, same token) — fine, or do you want Google Places (richer POI data, paid)?
