## Goal

Make giving a real title a required step before a video can be published — never let auto-filled filenames like `F16F66FC-507C-4493-A084-02B08B4A48AF` or `IMG_1234` reach the feed/map.

## Changes

### 1. `src/routes/create.tsx` — Upload flow
- **Don't pre-fill junk titles.** In `startUpload`, run the filename through an `isJunkTitle()` check. If it matches, leave `title` empty and focus the Title field after upload completes. If it's a real name (e.g. "prague-hotel.mp4"), keep the current behaviour of pre-filling it.
- **Junk patterns to detect:**
  - Raw UUIDs (`F16F66FC-507C-4493-A084-02B08B4A48AF`)
  - Camera roll patterns: `IMG_####`, `VID_####`, `MOV_####`, `DSC_####`, `PXL_…`, `RPReplay_Final…`, `ScreenRecording_…`, `trim.XXXX`
  - Pure hex / pure digits / strings with no letters
- **Block publish on junk titles.** Extend `handleSubmit` (and the import form's submit) to refuse finalize when the trimmed title is empty, under 3 chars, or still matches `isJunkTitle()`. Show toast: *"Give your video a title travellers will recognise."* and focus the Title field. Drafts are still allowed (so users can park work-in-progress).
- **Visible hint on the Title field** when it's empty or junk: small amber helper text *"Required — name this so people can find it on the map."*
- **Publish button stays disabled** until title passes the check (mirroring existing `!title.trim()` guard).

### 2. Backfill Linda's existing video
- One-off UPDATE on video `13cf89cd-961c-4fc1-998f-65db81f780ae`: set `title = 'Hotel Krystal, Prague'` (derived from existing `destination` + `city`) so the map stops showing the UUID immediately.

### 3. Optional sweep (same migration)
- Run a one-off UPDATE across `videos` where `title ~ '^[0-9A-Fa-f-]{20,}$'` OR `title ~* '^(IMG|VID|MOV|DSC|PXL|RPReplay)[_-]'`, setting `title = coalesce(destination, city, country, 'Untitled')`. Confirms no other published videos display junk.

## Out of scope
- Reading EXIF/metadata to suggest a title.
- AI-generated title suggestions.
- Renaming the underlying storage file.

## Files
- **Edit:** `src/routes/create.tsx` (Upload + Import flows + shared `isJunkTitle` helper)
- **DB:** one targeted UPDATE for Linda's row, plus optional sweep UPDATE
