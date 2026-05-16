## H. Map view (Section 16)

Mapbox token received. Since it's a **publishable** `pk.` token, it goes in the client bundle as `VITE_MAPBOX_PUBLIC_TOKEN` via the secrets tool (Lovable injects `VITE_*` secrets into the Vite build).

### 1. Secret + dependency
- `add_secret` → `VITE_MAPBOX_PUBLIC_TOKEN` (prefill with the token you just pasted).
- `bun add mapbox-gl react-map-gl` + `bun add -d @types/mapbox-gl`.

### 2. Database migration
- Add nullable `lat double precision`, `lng double precision` to `videos` and `deals`.
- Index: `create index on videos (lat, lng) where lat is not null;` (same for `deals`).
- No RLS change — existing public-read policies already cover the new columns.

### 3. Server functions (`src/lib/map.functions.ts`)
- `getMapPins({ bbox?: [w,s,e,n], layer: "videos"|"deals"|"both" })` → returns `{ videos: [{id,title,thumbnail_url,lat,lng,creator}], deals: [{id,title,image_url,discount_label,lat,lng}] }`. Uses `supabaseAdmin`, filters `lat is not null` + bbox when provided, `limit 500` per layer.
- Public (no auth middleware) — pins are already public data.

### 4. Coord capture (lightweight, no geocoding API)
- Extend `/create` (video upload) and `business/deals/new` + `business/deals/$id/edit` with two optional number inputs (lat, lng) plus a "Use my location" button (browser geolocation).
- Defer reverse-geocoding / autocomplete to a later pass — keeps this slice token-free beyond Mapbox tiles.

### 5. Map route (`src/routes/map.tsx`)
- `validateSearch` with zod: `lng`, `lat`, `zoom`, `layer: "videos"|"deals"|"both"` (defaults: world center, zoom 2, "both").
- `react-map-gl` Map with `mapbox://styles/mapbox/dark-v11`, `mapboxAccessToken={import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN}`.
- Clustered `Source`/`Layer` (GeoJSON) for each enabled layer; distinct colors (videos = primary, deals = accent).
- Top toggle pills: Videos / Deals / Both — updates `layer` search param.
- Tap unclustered pin → bottom sheet (`Sheet` from shadcn) showing a mini `VideoCard` (links to `/?v=<id>`) or deal card (links to `/deals/$id`).
- On `moveend`, debounce-update `lng/lat/zoom` in URL so deep links restore view.

### 6. Nav entry
- Add **Map** icon to `MobileShell` bottom nav (currently 5 slots: Feed, Search, Create, Saved, Profile). Swap Search → Map and move Search to a top-right icon on the feed header, OR add as 6th slot. I'll go with: replace nothing — add Map between Search and Create (6 slots, still fits 390px).

### 7. Tests (manual)
- Add lat/lng to one video + one deal → pins render.
- Toggle Videos/Deals/Both filters layer.
- Zoom out → clusters; zoom in → split + tap → bottom sheet opens correct card.
- Copy URL after panning → reopen → map restores at same view.
- Pin with no coords doesn't appear (sanity check).

### Out of scope (follow-ups)
- AI lat/lng backfill for existing rows (extend `runAutoTag`).
- Geocoding autocomplete on create/deal forms.
- Heatmap layer / "deals near me" radius search.

---

Reply **approve** and I'll: store the token, install deps, run the migration, then build the route + nav.
