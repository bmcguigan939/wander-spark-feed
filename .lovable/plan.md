## Goal

On the Create page, make it trivial to drop a Google Maps location: one input that accepts a pasted coordinate string, plus the existing "Use my location" button.

## Change

In `src/routes/create.tsx`, under **MAP LOCATION (OPTIONAL)**:

- Replace the two `Latitude` / `Longitude` number inputs with a single text input:
  - Placeholder: `Paste from Google Maps (e.g. 50.7236, -2.9326)`
  - On change, parse the value with a tolerant regex that accepts:
    - `lat, lng` (comma or whitespace separated)
    - Optional parentheses, ° symbols, or trailing N/S/E/W (apply sign accordingly)
    - Google Maps URLs containing `@lat,lng,zoom` or `?q=lat,lng` — extract the pair
  - When parsing succeeds, update internal `lat` / `lng` state (kept as strings, same as today) and show a small green check + parsed `lat, lng` preview below the field.
  - When parsing fails and the field is non-empty, show a subtle helper: `Couldn't read coordinates — paste like "50.7236, -2.9326"`.
- Keep the **Use my location** button; on success it fills the same single input with `lat, lng` (6 decimals) so the user sees the value and it stays editable.
- Submit path stays the same — `lat`/`lng` are already sent as numbers in `handleSubmit`.

## Out of scope

No backend, schema, or other UI changes. Tip text under the field is the only new copy.
