## I. Destination page enrichment (§15)

Turn `/destinations/$country/$city` from a plain video grid into a true destination hub with AI overview, top creators, deals, and a one-tap itinerary CTA. Reuses existing AI gateway + itinerary builder — no new secrets.

### 1. Database migration

New cache table so the AI summary is generated once per destination, not on every page view.

```sql
create table public.destination_summaries (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  city text not null,
  summary text not null,
  highlights jsonb not null default '[]'::jsonb,  -- ["Old Town","Beach…"]
  best_time text,
  generated_at timestamptz not null default now(),
  unique (country, city)
);
alter table public.destination_summaries enable row level security;
create policy "destination_summaries public read"
  on public.destination_summaries for select using (true);
-- writes via service role only (no insert/update policy)
```

### 2. Server function — `getDestinationOverview`

Single round-trip the page can call. In `src/lib/destinations.functions.ts` add:

```ts
getDestinationOverview({ country, city }) → {
  summary: { text, highlights[], best_time } | null,
  videos: <existing top videos, 24>,
  topCreators: [{ id, username, display_name, avatar_url, video_count, total_likes }] // top 6
  deals: [{ id, title, image_url, discount_label, url }]  // up to 6 active
  stats: { videos, creators, likes }
}
```

- `topCreators`: aggregate by `creator_id` from the destination videos query, join `profiles`, sort by total likes desc.
- `deals`: `supabaseAdmin.from('deals')` filter by `ilike country` and `ilike city` (when city set), active + within window, limit 6.
- `summary`: read from `destination_summaries`; if missing, return null (don't block). UI shows a "Generate overview" button gated on auth.

### 3. Server function — `generateDestinationOverview` (auth-required)

Uses Lovable AI (same pattern as `itineraries.functions.ts`): `google/gemini-3-flash-preview`, JSON response, schema `{ summary: string, highlights: string[3..6], best_time: string }`. Feeds the model the top 12 video titles + activity tags for grounding. Upserts into `destination_summaries`. Returns the new row.

Rationale for auth-gating: prevents drive-by AI spend on arbitrary `/destinations/anywhere/anything` URLs. After first user generates it, all visitors see the cached version.

### 4. UI — `/destinations/$country/$city`

New layout (still inside `MobileShell`):

```text
[back]
[Hero card] city · country · stats (videos/creators/likes)
[AI summary block]
  - if null → "Generate AI overview" button (signed-in users only)
  - if present → 2-line summary, "Best time: …", highlight chips
[Plan a trip] → /itineraries/new?destination=City,Country
[Top creators] horizontal scroll of 6 avatars + name
[Deals] horizontal scroll, links to /deals/$id (skip section if empty)
[Videos] existing 2-col grid (unchanged)
```

- "Plan a trip" prefills the itinerary form via search params (small tweak to `/itineraries/new`: read `?destination=` and seed the field).
- Wrap the AI generation in `useMutation`; on success `queryClient.invalidateQueries(['destination-overview', country, city])`.
- Empty states: no deals → hide section; no top creators (single uploader) → hide section; no videos → existing "No videos here yet" message.

### 5. Small support tweaks

- `src/routes/itineraries.new.tsx`: add `validateSearch` for optional `?destination=string` and seed the form's destination state.
- No changes to `/destinations/$country` country index page in this slice.

### 6. Test checklist

- Visit a city with videos → grid still renders, summary shows "Generate" button.
- Click Generate (signed in) → spinner ≤ 10s → summary, highlights, best time appear.
- Refresh → summary persists (loaded from `destination_summaries`).
- Signed-out user on same page → sees cached summary read-only.
- "Plan a trip" navigates to `/itineraries/new` with destination prefilled.
- City with active deals → deals strip renders and tapping a deal opens its page.
- City with multiple uploaders → top creators strip renders; single uploader → hidden.
- Brand-new city (no cache, no signed-in user) → page still works, just no summary.

### Out of scope (follow-ups)

- Weather widget (needs OpenWeather key — confirm with user before adding).
- Per-destination map preview (could embed the `/map` view filtered to country/city later).
- Auto-regenerate summaries when new videos appear (manual refresh button is enough for v1).

---

Reply **approve** to proceed.
