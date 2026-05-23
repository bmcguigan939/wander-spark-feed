## Goal
Let creators open any past upload and edit its details — title, description, location, tags, budget — plus add new business affiliations / deals at any time.

## Changes

### 1. New server fn: `updateVideoMetadata`
File: `src/lib/studio.functions.ts`
- `requireSupabaseAuth`, Zod-validated input: `videoId`, `title` (1–160), `description?` (≤2000), `destination?`, `country?`, `city?`, `activity_tags?` (≤10, lowercased), `budget_tag?` (`budget|mid|luxury|none`).
- Updates `videos` filtered by `id` + `creator_id = userId`. Does NOT touch `status`, `is_draft`, `scheduled_at`, `published_at`, or media fields.

### 2. Expose editable fields in `getVideoInsights`
Add `description, destination, country, city, activity_tags, budget_tag` to the existing select so the edit sheet can prefill.

### 3. New component: `EditVideoSheet`
File: `src/components/studio/EditVideoSheet.tsx`
- Bottom `Sheet` with form (title, description, country, city, destination, activity tags comma input, budget radio).
- On save: calls `updateVideoMetadata`, invalidates `["studio-insights", id]`, `["studio-videos"]`, `["feed"]`, toasts "Saved", closes.

### 4. Wire into `/studio/videos/$id`
File: `src/routes/studio.videos.$id.tsx`
- Add "Edit details" button (opens `EditVideoSheet`) next to the existing Preview link.
- Add "Add deals" button that opens the existing `SmartDealsSheet` (already used on `studio.videos.tsx`) so creators can attach new business affiliations to any old upload.

### Out of scope
Editing the video file/thumbnail/music, changing publish state, profile-level edits.

Approve to implement.
