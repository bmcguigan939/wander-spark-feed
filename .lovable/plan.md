## Goal

When a user scrolls the feed, the next clip should start playing immediately with sound — no tap-to-unmute required (after the first interaction allows it).

## Why it isn't already working

In `src/components/feed/VideoCard.tsx` the player is hard-coded to start muted:

- `useState(true)` for `muted`
- `autoPlay={active ? "muted" : false}`

So every clip plays silent until the user taps to unmute. Browsers/iOS also block autoplay-with-sound until the page has received a user gesture — we have to handle that fallback.

## Plan

Edit only `src/components/feed/VideoCard.tsx` (frontend/presentation only).

1. **Session-wide sound preference.** Replace the per-card `useState(true)` with a tiny shared store (module-level `let` + listener set, or a `useSyncExternalStore` hook in the same file) backed by `sessionStorage` key `travidz:feedSound` (default `"on"`). Once any clip is successfully unmuted, every other card mirrors that state immediately — no more re-muting between scrolls.

2. **Try sound first, fall back to muted.** When `active` becomes true:
   - Set the player muted to the current preference (`false` if sound is on).
   - Call `playerRef.current.play()` in a `try/catch`. If it rejects (autoplay-with-sound blocked before first gesture), set muted to `true` and retry `play()`, and flip the shared preference to `"off"` so the UI shows the "tap for sound" affordance.
   - When the card goes inactive, `pause()` it.

3. **Tap toggles sound for the whole feed.** The existing `onClick={() => setMuted(m => !m)}` becomes `toggleFeedSound()` — updates the shared store, persists to `sessionStorage`, and unmutes/mutes the active player. First tap also "unlocks" autoplay-with-sound for subsequent scrolls.

4. **One-time gesture unlock on the feed.** On mount, attach a one-shot `pointerdown`/`touchstart` listener on `window` that, if the preference is `"on"` but the active player is currently muted (because autoplay was blocked), unmutes and resumes it. Remove after fire.

5. **Replace static `autoPlay` prop.** Drop `autoPlay={active ? "muted" : false}` in favour of imperatively driving `play()`/`pause()` + `muted` from the `active` effect — gives us the try-sound-then-fallback behaviour above. Keep `playsInline`, `loop`, `poster`.

6. **Subtle "tap for sound" hint.** When the active card is muted *because* autoplay-with-sound was blocked (not because the user chose mute), show a small pill (e.g. "Tap for sound 🔊") near the existing right-rail buttons that disappears on first tap. Reuses existing Tailwind tokens — no new design system.

No backend, schema, or server-function changes. No other components touched.

## Out of scope

- Per-creator default volume.
- Remembering sound preference across sessions (sessionStorage only, matches existing `travidz:feedCollapsed` convention).
- Background audio when the app is backgrounded.

## Caveat to flag

iOS Safari and most mobile browsers will still refuse autoplay-with-sound until the very first user gesture on the page. The first clip a fresh visitor sees may start muted with the "Tap for sound" hint; every clip after their first tap will play instantly with sound. This is a platform constraint, not something we can bypass.
