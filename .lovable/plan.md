# Fix profile header UI

## What's wrong (from your screenshot)

On `/profile`, the `CinematicHeader` is being passed `avatar_url` as its background `image`. For most users that URL is a low-res dicebear **initials SVG** (just the letter "B"), so it gets stretched edge-to-edge as the banner — producing the giant blurry "B" you saw. Below it, the round avatar is pulled up with `-mt-16` next to empty space, leaving an awkward gap before the stats row.

## Changes (single file: `src/routes/profile.tsx`)

1. **Stop using the avatar as the header background.**
   Pass `image={null}` to `CinematicHeader` so it falls back to the existing `bg-aurora` gradient — the same warm gradient used elsewhere in the app. (Later we can add a real cover-photo field if you want; not in scope now.)

2. **Reposition the avatar so it overlaps the header cleanly.**
   - Reduce header height from `h-56` to `h-44` so the page feels less top-heavy.
   - Wrap the avatar + name block in a row: avatar on the left (overlapping the header with `-mt-12`), display name + @handle stacked to its right.
   - Remove the now-duplicate name shown inside the header (move `@username` + display name out of `CinematicHeader.title/subtitle` and keep only the eyebrow "TRAVELLER · CREATOR · …" and the settings cog in the header).

3. **Tighten spacing** between the avatar row, bio, and the stats line so there is no large empty band.

## Result

- No more giant stretched "B" background.
- Clean aurora gradient header with role eyebrow + settings cog.
- Avatar overlaps the header naturally with the username beside it, like the public `/u/$username` page.
- No backend, no schema, no other routes touched.

## Out of scope

- Adding a real user-uploaded cover photo (can be a follow-up).
- Restyling the action buttons stack (Business portal, Itineraries, etc.) — those render fine.
