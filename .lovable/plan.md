## Why this happens today

When a creator uploads, the row is inserted with `status = 'processing'`. Mux processes the file (usually 10–60s) and our webhook flips it to `status = 'ready'` the moment it's done. The DB is correct — but the Studio Videos screen only re-queries when the user navigates away and back, or taps "Refresh status". So the card just sits on "Processing" and looks broken.

## Fix: Supabase Realtime on the creator's own videos

Subscribe to changes on the `videos` table scoped to `creator_id = me`. When the row flips to `ready` (or `errored`), invalidate the `studio-videos` and `studio-overview` query caches — the list updates instantly with no polling and no extra server load.

### 1. Enable Realtime on the `videos` table (migration)

```sql
ALTER TABLE public.videos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
```

RLS already restricts what each creator can subscribe to, so they only get events for their own rows.

### 2. Subscribe in `src/routes/studio.videos.tsx`

Inside `VideosPage`, add a `useEffect` that:
- Gets the current `user.id` (already available via `useAuth`).
- Opens a channel `studio-videos:{userId}` listening to `postgres_changes` on `public.videos` with `filter: creator_id=eq.{userId}` for `event: '*'` (covers INSERT for new uploads, UPDATE for status flips, DELETE for removals).
- On any event: `qc.invalidateQueries({ queryKey: ['studio-videos'] })` and `qc.invalidateQueries({ queryKey: ['studio-overview'] })`. Optionally show a small toast when a row goes `processing → ready` ("'Title' is live").
- Cleans up the channel on unmount.

### 3. Same subscription on the Studio overview (`src/routes/studio.index.tsx`)

So the dashboard cards (counts, latest video thumbnail) refresh in real time too. Same pattern — single channel, invalidate `studio-overview`.

### 4. Soften the "Processing" UX

- Replace the static badge with a subtle pulsing dot so it feels alive while waiting.
- Keep the manual "Refresh status" button as a fallback (covers the rare case where the Mux webhook is delayed) but stop nagging the user — it's now a safety net, not the primary path.

## Files touched

- New migration: enable realtime on `videos`.
- `src/routes/studio.videos.tsx` — add realtime subscription + cache invalidation.
- `src/routes/studio.index.tsx` — add the same subscription.
- Minor badge polish on the processing row.

## Out of scope

- No changes to the upload flow or Mux webhook itself (already correct).
- No polling fallback — realtime is reliable enough and the manual refresh button stays as the escape hatch.
