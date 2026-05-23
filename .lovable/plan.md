## Goal
Add an "Edit details" option to the `⋯` dropdown on each video card in `/studio/videos` so creators can update title, description, location, tags, and budget on previously uploaded videos.

## Approach
The edit sheet already exists at `src/components/EditVideoSheet.tsx` (uses `updateVideoMetadata` server fn). It's currently only wired into the per-video insights page. We'll reuse it directly from the videos list.

## Changes

### 1. `src/lib/studio.functions.ts`
Extend `StudioVideo` type and the `listMyVideos` select to include the fields the edit sheet needs:
- `description`, `destination`, `country`, `city`, `activity_tags`, `budget_tag`

### 2. `src/routes/studio.videos.tsx`
- Import `EditVideoSheet` and a `Pencil` icon from lucide-react.
- Add `const [editTarget, setEditTarget] = useState<StudioVideo | null>(null);`
- Add a new `<DropdownMenuItem onSelect={() => setEditTarget(v)}>` labeled "Edit details" at the top of the dropdown (just under "View insights").
- Render `<EditVideoSheet>` at the bottom of the page, controlled by `editTarget`, passing `initial` mapped from the selected video's metadata fields.

No backend / RLS / route changes needed — `updateVideoMetadata` already enforces creator ownership.
