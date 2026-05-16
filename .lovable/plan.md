## Goal

Make AI-generated itineraries actionable: each day should surface (a) **booking links** for suggested hotels/activities and (b) **related Travidz videos** from creators who've covered the same destination/activities.

## How it works

### 1. Enrich the AI plan schema

Extend each day in the itinerary `plan` JSON to include structured suggestions instead of free-text only:

```text
day: {
  day, title, summary,
  morning/afternoon/evening: { text, suggestion_keys[] },
  tips[],
  suggestions: [
    { key, kind: "hotel"|"activity"|"tour"|"restaurant",
      title, query, tags[] }
  ]
}
```

`query` + `tags` are what we match against our `deals` table and `videos` table. The AI is prompted to emit 3–6 suggestions per day with concrete names ("Uluwatu Temple sunset tour", "Hotel Indigo Bali Seminyak").

### 2. Match suggestions to real deals

In `generateItinerary` handler, after the AI returns the plan:
- For each suggestion, query `deals` where `status='approved'` AND `is_active=true` AND (destination/city ILIKE OR activity tags overlap OR title ILIKE query).
- Keep top 1–2 matches per suggestion, store their `id`, `title`, `price`, `image_url`, `affiliate_network` on the suggestion as `deal_matches[]`.
- Booking link uses the existing `/api/public/d/$id` redirect (already wraps affiliate tracking).

### 3. Match suggestions to related videos

Same loop:
- Query `videos` using the existing `search_tsv` full-text index with the suggestion's `query` + destination, filtered to `status='ready'`, `is_draft=false`.
- Keep top 1–2 videos per suggestion, store `{ id, title, thumb_url, creator_username }` as `video_matches[]`.

If no deal/video match exists, the suggestion still renders — just without buttons.

### 4. UI changes — `itineraries.$id.tsx`

Under each day's morning/afternoon/evening block, add a **Suggestions** section:

```text
┌─ Uluwatu Sunset Tour ─────────────┐
│  [thumb] $45 · GetYourGuide       │
│  [ Book → ]                       │
│                                   │
│  Watch: @balidreamer · Uluwatu… ▶ │
└───────────────────────────────────┘
```

- Booking button → `/api/public/d/{deal_id}` (opens in new tab).
- Video chip → navigates to the feed scrolled to that video (or `/u/$username` for now if no single-video route exists).
- Empty-match suggestions show just the title + "Search Travidz" link → `/search?q=...`.

### 5. Prompt update

Tighten the system prompt so the AI:
- Always names real, bookable places/tours (no vague "go to a beach").
- Emits the `suggestions[]` array per day with stable `key` strings.
- Mentions suggestion keys inside morning/afternoon/evening text so we can highlight them.

## Files to change

- `src/lib/itineraries.functions.ts` — extend `PlanSchema`, update prompt, add deal+video matching after AI call, store enriched plan.
- `src/routes/itineraries.$id.tsx` — render new `suggestions` block with booking + video cards.
- No DB migration needed (uses existing `plan jsonb` column).

## Out of scope

- "Blogs" as a separate content type — we don't have a blogs table. Videos are our equivalent and cover the same intent. If you want true blog posts later, that's a separate feature.
- Editing/regenerating individual days.
- Saving suggestions to a collection (could be a follow-up).

## Open question

Should the booking button link out immediately (current `/api/public/d/$id` 302 to supplier), or open an in-app deal detail page first (`/deals/$id`) so users see the full info + related videos before leaving? I'd recommend **in-app `/deals/$id`** — keeps users on Travidz longer and shows the affiliate context.
