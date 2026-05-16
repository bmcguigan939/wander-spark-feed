## What's left

Two queued items from the original roadmap:

- **Step 2 — Mux Player + caption toggle** (recommended next)
- **Step 5 — Transcript-driven re-tagging** (depends on captions existing)

Step 2 unblocks Step 5 (captions/transcripts come from Mux), so it should ship first.

## Step 2: Mux Player + caption toggle

### Scope

1. **Swap the feed video element** in `src/components/feed/VideoCard.tsx`
   - Replace the raw `<video>` tag with `@mux/mux-player-react`'s `<MuxPlayer>` (lazy variant).
   - Drive it from `playback_id` instead of the HLS URL. Keep current autoplay-when-visible, mute/unmute, and tap-to-pause behavior.
   - Preserve poster/thumbnail handling.

2. **Caption toggle**
   - Add a small CC button next to the mute control.
   - When captions exist on the active text track, toggle `mode = "showing" | "hidden"`.
   - Hide the button entirely when the video has no text track.
   - Persist the user's choice in `localStorage` so it sticks across videos.

3. **Backend: request auto-captions from Mux**
   - In `src/lib/mux.functions.ts` (asset creation path), add `input[].generated_subtitles: [{ language_code: "en", name: "English (auto)" }]`.
   - No schema change — Mux delivers captions as a text track on the same playback ID.

4. **Webhook awareness** (`src/routes/api/public/mux-webhook.ts`)
   - Existing `video.asset.ready` handler stays as-is.
   - Optionally log `video.asset.track.ready` for visibility; no DB writes needed for Step 2.

5. **Verify**
   - Existing videos: player loads, autoplay + mute behavior unchanged, CC button hidden (no tracks yet).
   - New upload after the change: caption track appears within ~1 min of `ready`; CC button shows; toggle works; preference persists.

### Out of scope for Step 2

- Storing the transcript in our DB (that's Step 5).
- Translating captions to other languages.
- Custom caption styling beyond Mux Player defaults.

### Technical notes

- `@mux/mux-player-react` is not yet a dependency — needs `bun add`.
- `MuxPlayer` exposes `textTracks` via a ref; the CC button reads/sets `mode` on the first subtitles track.
- Mux's `generated_subtitles` is free for standard-tier assets and runs async after ingest.

---

## Step 5 preview (after Step 2 lands)

Pull the finished transcript from Mux, store it on `videos.transcript`, and re-run the deal-matching/tag extraction against the transcript text so videos get better city/country/keyword matches than the creator's manual caption alone. Triggered from the `video.asset.track.ready` webhook.

Say the word and I'll implement Step 2.
