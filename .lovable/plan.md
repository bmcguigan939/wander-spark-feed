## Next step: Click analytics dashboard for businesses (Step 3)

The Deal CTA on the feed now generates attributed `deal_clicks` rows with `referrer_video_id`. Time to make that data useful to businesses with a real analytics dashboard.

### Scope

1. **New server fn** `getDealStats({ dealId, range })` in `src/lib/deals.functions.ts`
   - `range`: `"7d"` | `"30d"` (default `"7d"`).
   - Uses `requireSupabaseAuth` and the user-scoped supabase client so RLS on `deal_clicks owner read` enforces ownership automatically.
   - Returns:
     - `totals`: `{ clicks, uniqueUsers }` over the range.
     - `daily`: array of `{ day: ISO date, clicks }` (zero-filled for missing days, client-side).
     - `topVideos`: top 5 referring videos with `{ videoId, title, thumbnail_url, creator_username, clicks }` — joined client-side from a second query against `videos` + `profiles`.
   - One SELECT on `deal_clicks` with `clicked_at >= now() - interval`, group/aggregate in JS to keep the query simple.

2. **`/business` dashboard upgrade** (`src/routes/business.index.tsx`)
   - For each deal row, fetch stats in parallel (`useQueries`) and show:
     - 7-day click total + delta vs. previous 7 days.
     - Tiny inline sparkline (SVG path, no chart lib needed).
   - Keep current "Active/Paused" + edit link.

3. **New per-deal detail route** `src/routes/business.deals.$id.tsx`
   - Header: deal title, location, status, edit/delete shortcuts.
   - Range toggle (7d / 30d).
   - Larger daily time-series chart (SVG area chart, hand-rolled, theme tokens).
   - "Top referring videos" list with thumbnail, creator @handle, click count, link to creator profile.
   - Gracefully empty-state when no clicks yet.

4. **Verify**
   - With seeded Canggu deal: navigate `/business`, see 0–1 clicks reflected after tapping the feed CTA.
   - Per-deal page renders chart + top videos.
   - Non-owner cannot read stats (RLS blocks; server fn throws cleanly).

### Out of scope

- CSV export (can be a one-line follow-up later).
- Real-time updates / websocket subscriptions.
- Mux Player caption toggle (Step 2 — still queued).

### Technical notes

- All aggregation in JS keeps the migration count at zero. If volumes grow we can swap to a SECURITY DEFINER SQL function later.
- Sparkline: 60×20 SVG, one `<path d="M…L…">` plus a baseline; no external dep.
- `topVideos` join: collect distinct `referrer_video_id`s, then `supabaseAdmin.from('videos').select('id,title,thumbnail_url,creator:profiles!videos_creator_id_fkey(username)').in('id', ids)`. Aggregate counts in JS.
- Route file `business.deals.$id.tsx` collides with nothing — sibling `business.deals.$id.edit.tsx` is `/business/deals/:id/edit`, this becomes `/business/deals/:id`.
- All new fns continue using `createServerFn` + `requireSupabaseAuth`. No schema or RLS changes.
