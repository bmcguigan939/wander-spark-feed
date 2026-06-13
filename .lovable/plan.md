# Make every video appear on the map

## Root cause
The create form treats `lat`/`lng` as optional. If the creator only types an address into Destination/City/Country, the post saves with NULL coordinates and the map filter excludes it. Linda's Prague upload (and 4 earlier posts) are in this state.

## Fix

### 1. Prompt for a pin at publish time (`src/routes/create.tsx`)
When the user taps Publish and `lat`/`lng` are empty:
- If Destination/City/Country has text, call the existing `geocodePlace` server fn with that text and present a confirmation sheet: "Is this the right spot? — drop the pin here, adjust, or cancel."
  - Accept → use the geocoded `lat`/`lng`, continue publishing.
  - Adjust → open the existing `LocationPickerSheet`, seeded at the geocoded point.
  - Cancel → block publish, show "Drop a pin on the map so travellers can find this post."
- If no address text was entered either → block publish with the same message and open `LocationPickerSheet`.

Result: no future video can be saved without coordinates, and the user is never forced into a manual map step when their typed address geocodes cleanly.

### 2. Visual cue on the form
Replace the silent optional state with an inline warning when `lat`/`lng` is empty: "This post won't show on the map until you drop a pin." Keep the existing "Pick on map" button as the primary action.

### 3. Backfill Linda's 5 videos
Run a one-off update: for each of her NULL-coordinate videos, geocode `destination + city + country` server-side via Mapbox and write `lat`/`lng`. Done as a manual `supabase--insert` UPDATE per row (or a small admin server fn if you'd like it reusable for any creator later — say the word and I'll add that instead).

## Files touched
- `src/routes/create.tsx` — publish guard + geocode-confirm flow + warning banner.
- (Optional) `src/lib/admin.functions.ts` — `backfillVideoCoordinates` admin fn, if you want a reusable tool rather than a one-off update.

## Out of scope
- Changing the map filter to show videos without coordinates (would require fake/approximate pins and degrade map quality).
- Reverse-geocoding existing free-text into structured city/country — only `lat`/`lng` is being backfilled.
