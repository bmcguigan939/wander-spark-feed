# Shrink profile header to a slim strip

## What's wrong now

The aurora gradient header takes ~40% of the screen and dominates the page. It should be a thin top strip that holds just the role eyebrow and the settings cog — content (avatar, name, action buttons) is what should fill the viewport.

## Changes (single file: `src/routes/profile.tsx` + tiny tweak in `src/components/ui/cinematic.tsx` if needed)

1. **Header height**: drop from `h-44` to `h-16` (a slim strip, ~64px). Just enough room for the role eyebrow on the left and the settings cog on the right, vertically centered.

2. **Header content layout**: switch from the bottom-aligned cinematic layout to a simple centered row — eyebrow left, cog right. Remove the now-unused screen-reader-only `<h1>` from inside the header (the visible `@username` heading below will carry the H1).

3. **Avatar overlap**: since the header is much shorter, reduce avatar negative margin from `-mt-12` to `-mt-8` so it still overlaps the strip cleanly without floating in dead space.

4. **Keep**: the aurora gradient background, the role eyebrow text, the settings cog, the avatar+name row, and everything below.

## How

`profile.tsx` currently passes `height="h-44"` and uses `CinematicHeader`'s default bottom-aligned layout. The cleanest fix is to **stop using `CinematicHeader`** on this page and inline a small `<header className="relative h-16 bg-aurora ...">` with a flex row. That avoids touching the shared `CinematicHeader` component (which other pages still rely on for its tall cinematic look).

## Result

- Header is a slim ~64px strip with the role chips and settings cog.
- Avatar, name, stats, and the full action button stack are immediately visible without scrolling.
- No other pages affected.
