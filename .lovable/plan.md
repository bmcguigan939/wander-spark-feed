## Problem

On `/create` → "Import From Socials", the YouTube / TikTok / Instagram / X tiles look tappable (rounded card, icon, label, "SUPPORTED" badge) but are inert `<div>`s. Nothing happens when they're tapped.

## Fix

In `src/routes/create.tsx` (`ImportFlow`, lines ~363–378), convert each platform tile into a `<button type="button">` that:

1. Sets a platform-specific placeholder on the paste-link input (e.g. `https://youtube.com/shorts/…`, `https://tiktok.com/@user/video/…`, `https://instagram.com/reel/…`, `https://x.com/user/status/…`).
2. Focuses the URL `<input>` (via a `useRef<HTMLInputElement>`) and scrolls the "Paste a link" card into view so the next action is obvious on mobile.
3. Visually marks the selected tile (ring + stronger background) so the user sees their choice was registered.

Add minimal state: `const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey | null>(null)` and a `urlInputRef`. Replace the static `placeholder="https://youtube.com/shorts/…"` with one derived from `selectedPlatform` (fallback to current default).

Also include Facebook in the tile grid for parity with `PLATFORM_META` (currently only 4 of 5 shown), since the importer already supports it — optional, mention in the diff but only add if it fits the 2-col grid cleanly (a 5th tile would orphan; safer to keep the grid at 4 and leave Facebook out, matching today's layout).

Use proper platform brand icons where available from lucide-react (`Youtube`, `Instagram`, `Twitter` for X) instead of the generic `Link2`, keeping `Link2` only as TikTok's fallback.

## Out of scope

- No backend / server-function changes.
- No change to the preview/import flow once a link is pasted.
- No new route or OAuth "Connect YouTube account" — tiles remain link-paste helpers, not account connectors.

## Verification

- Tap each tile → URL input gains focus, placeholder updates to that platform's URL shape, tile shows selected ring.
- Paste a real URL → existing Preview → Import flow still works unchanged.
- Keyboard: tile is reachable via Tab and activates on Enter/Space (native `<button>` behaviour).
