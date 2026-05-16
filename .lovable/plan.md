## Section P — Creator Studio polish + cinematic UI tidy

Two workstreams in one slice: ship the remaining creator-studio polish (§P), then a focused visual pass so the app feels cinematic and editorial. No business-logic changes outside P.

---

### Part 1 — Creator Studio (§P)

**Goal:** give creators a real "studio" instead of a scattered set of pages — drafts, scheduled posts, deeper per-video analytics — all reachable from one hub at `/studio`.

**Database migration**
- `videos`: add `is_draft boolean default false`, `scheduled_at timestamptz null`, `published_at timestamptz null`.
- Update the public-read RLS on `videos` so unpublished/scheduled videos are only visible to their creator + admins (`status='ready' AND is_hidden=false AND is_draft=false AND (scheduled_at IS NULL OR scheduled_at <= now())`).
- `feed.functions.ts` ranker pool query: add the same publish gate.
- One-shot backfill: `published_at = created_at` for existing ready videos.

**Server functions (`src/lib/studio.functions.ts`)**
All `requireSupabaseAuth` + creator-role guard.
- `listMyVideos({status?: 'all'|'draft'|'scheduled'|'live'|'processing'})` — returns videos with counts + matched-deal hint.
- `setVideoDraft({videoId, isDraft})`, `scheduleVideo({videoId, scheduledAt|null})`, `publishVideoNow({videoId})`.
- `getVideoInsights({videoId, days?})` — per-video time series: views, likes, saves, comments, watch_ms, deal clicks (from existing tables `video_views`, `likes`, `saves`, `comments`, `deal_clicks`). Aggregated server-side by day.

**Routes**
- `/studio` — overview: greeting, "Publish queue" (drafts + scheduled), 4 KPIs (last 7d views/likes/saves/followers gained), links to upload + analytics.
- `/studio/videos` — list with filter chips (All · Live · Scheduled · Drafts · Processing), search, row actions: Edit, Publish, Save as draft, Schedule, Delete, View insights.
- `/studio/videos/$id` — per-video insights page (sparkline + 7/30d toggle, top-line counters, deal click breakdown if any, list of recent comments with quick reply link).
- `/studio/schedule` — small calendar-ish list grouped by day for everything with `scheduled_at` in the future.
- Existing `/creator/analytics` stays but is linked from `/studio` and gets a back-link.

**Upload flow change (`/create`)**
- After upload completes, instead of jumping straight to feed, land on a "Ready to post" screen with three buttons: **Publish now**, **Save as draft**, **Schedule…**. Default Publish now (so current behavior is preserved with one extra confirmation step).

**Nav**
- Replace the bottom-bar "Create" `+` for creators with a "Studio" entry (still opens upload via a primary action button on `/studio`). For non-creators, keep current Create behavior.
- Profile page: add "Creator studio" link (next to existing Analytics) for creators.

**Out of scope (won't build)**
- Recurring schedules, bulk publish, A/B thumbnails, post-to-multiple-platforms, email digest of insights.

---

### Part 2 — Cinematic UI tidy

**Scope:** purely visual/typographic. No new features. Touches global tokens + shared shells + the top-traffic routes (feed, profile, search, destinations, studio).

**Design tokens (`src/styles.css`)**
- Keep dark-first but deepen base: `--background` slightly cooler/darker; introduce `--surface-1`, `--surface-2`, `--surface-3` for layered depth instead of one flat `--card`.
- Add gradient + shadow tokens: `--gradient-aurora` (sunset → ocean), `--gradient-overlay-bottom` (transparent → near-black 85%), `--shadow-cinematic` (long, soft, primary-tinted).
- Typography upgrade: swap display font to **Fraunces** (editorial serif w/ optical sizing) for h1/h2 + hero numerals; keep **Inter** for body; add a third utility token `--font-mono` (JetBrains Mono) for stats/timecodes. Load via `<link>` in `__root.tsx`.
- Tighter heading tracking (`-0.02em`), `font-feature-settings: "ss01","ss02","ss03"` on display.

**Reusable primitives (new in `src/components/ui/`)**
- `<CinematicHeader title subtitle eyebrow image?>` — full-bleed image w/ bottom gradient overlay, serif H1, small uppercase eyebrow chip. Used on destinations, profile, studio, deals detail.
- `<StatTile icon label value trend?>` — glass surface, mono numerals, optional sparkline.
- `<Chip>` and `<Pill>` — consistent radius / hover / active states (replaces the ad-hoc chip styles in feed, search, business pages).
- `<SectionTitle eyebrow title trailing?>` — editorial section header (eyebrow + serif title + optional CTA).
- `<EmptyState icon title body action?>` — replaces the per-page `FullEmptyState` clones in feed/collections/profile.

**Global polish**
- Feed: smaller, more refined right-rail action stack (replace solid bg pills with frosted circles + tactile press state); bottom info panel uses the new bottom gradient + serif title overlay; CC and mute glyphs unified.
- Bottom nav: thinner top border replaced with frosted backdrop only; active tab gets a 2px primary underline + subtle scale; remove text labels on >sm width, keep on mobile.
- Profile/destination headers swapped to `<CinematicHeader>` so they read like a magazine cover.
- All `rounded-2xl` cards → consistent `rounded-[1.25rem]` + `shadow-cinematic` on raised surfaces.
- Subtle entry animation (`animate-fade-in` from existing utilities) on route mount for major sections; respect `prefers-reduced-motion`.
- Replace the two custom skeleton blocks with a shared `Skeleton` from `components/ui/skeleton` styled with a slow shimmer.

**SEO/meta touch-up**
- Each new `/studio*` route gets its own `head()` with title + description, no og:image (private pages).

**Out of scope**
- Light mode (still dark-first), redesigning the login flow, swapping any third-party widget (Mux player, Mapbox), changing iconography library.

---

### Technical notes
- `studio.functions.ts` follows the existing `*.functions.ts` pattern (`createServerFn` + `requireSupabaseAuth`); no edge functions.
- The publish gate is enforced at **both** RLS and the ranker query so a misuse can't leak drafts.
- Insights aggregation is done in SQL (`date_trunc('day', created_at)`) on `video_views`/`likes`/`saves`/`comments`/`deal_clicks`, no new tables.
- Type-only edits to `src/integrations/supabase/types.ts` will happen automatically after the migration runs.

### Verification
1. Run migration → confirm drafts/scheduled videos don't appear in `/` feed for other users.
2. Upload a video, choose "Save as draft" → appears in `/studio/videos` under Drafts, not on profile public view.
3. Schedule a video 2 min in the future → appears on `/studio/schedule`, becomes visible after the timestamp on a refresh (no cron needed, RLS gates it).
4. Per-video insights page renders a sparkline for a video with views.
5. Visual sweep: home feed, profile, a destination page, `/studio` — all share new header/stat tile/chip styling; nothing overflows on 390px width.