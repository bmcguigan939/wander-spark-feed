# Section P — Creator Studio polish

All server logic (`src/lib/studio.functions.ts`) and schema fields (`is_draft`, `scheduled_at`, `published_at`) are already in place. The remaining gap is the **UI**: `/studio` currently shows a layout shell with tabs pointing to `/studio/videos` and `/studio/schedule`, but those route files don't exist, and there's no per-video insights page.

## What to build

### 1. `src/routes/studio.index.tsx` — Overview
- Calls `getStudioOverview`.
- 4 KPI cards (Views / Likes / Saves / Followers, last 7d).
- "Content health" row: chips for live / scheduled / draft / processing / hidden counts.
- "Up next" queue list (drafts + scheduled), each row links to `/studio/videos/$id`.
- Empty state with CTA to `/create`.

### 2. `src/routes/studio.videos.tsx` — Library
- Calls `listMyVideos({ filter, q })`.
- Sticky filter pills (All / Live / Scheduled / Draft / Processing) with counts.
- Search input (debounced 300ms) bound to `q`.
- Card rows: thumbnail, title, state badge, mini-stats (views/likes/saves), kebab menu with actions:
  - Open insights (`/studio/videos/$id`)
  - Publish now (`publishVideoNow`)
  - Save as draft (`setVideoDraft true/false`)
  - Schedule… (opens sheet with datetime picker → `scheduleVideo`)
  - Delete (existing creator RLS delete via supabase client + AlertDialog)
- Optimistic invalidate of `["studio","videos"]` and `["studio","overview"]` after each mutation.

### 3. `src/routes/studio.schedule.tsx` — Schedule
- Reuses `listMyVideos({ filter: "scheduled" })` plus drafts.
- Grouped by date (Today / Tomorrow / This week / Later).
- Each row: thumbnail, title, scheduled time, "Reschedule" + "Publish now" buttons.
- Empty state: "Nothing scheduled — schedule a video from your library."

### 4. `src/routes/studio.videos.$id.tsx` — Insights
- Calls `getVideoInsights({ videoId, days: 14 })`.
- Header: thumbnail + title + state badge + back link.
- 6 stat tiles: Views, Likes, Saves, Comments, Watch time (mm:ss), Deal clicks.
- 14-day sparkline chart (views/likes/saves) using Recharts (already in deps).
- "Recent comments" list (up to 8) with avatar + body.
- Action bar: Publish now / Save as draft / Schedule / Delete (same mutations as library).

### 5. Wire schedule sheet
- Small reusable `<ScheduleSheet videoId currentScheduledAt onClose />` component (`src/components/studio/ScheduleSheet.tsx`) — datetime-local input + Save / Clear schedule buttons. Used by both library and insights.

### 6. Create-flow integration
- `src/routes/create.tsx`: after a successful upload, add a small "Save as draft" toggle and a "Schedule for…" datetime field. On submit, call `setVideoDraft` or `scheduleVideo` immediately after the video row is created.

## Out of scope (deferred)

- A pg_cron job to flip `published_at` when `scheduled_at` passes — feed RLS already gates visibility by `scheduled_at <= now()`, so videos go live automatically. We can add a cron later only if we want a precise `published_at` timestamp.
- Bulk actions, CSV export.
- Per-day Mux delivery analytics (would need Mux Data API).

## Files

Create:
- `src/routes/studio.index.tsx`
- `src/routes/studio.videos.tsx`
- `src/routes/studio.videos.$id.tsx`
- `src/routes/studio.schedule.tsx`
- `src/components/studio/ScheduleSheet.tsx`

Edit:
- `src/routes/create.tsx` — draft/schedule controls on submit.

No DB migration, no new secrets.
