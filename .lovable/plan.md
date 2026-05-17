# What's left to ship Travidz (excluding banking/payments)

Phases 0 and 1 are done: schema FKs, triggers, legal pages, notifications wiring, analytics rate-limiting, account delete + export, sitemap/robots, onboarding/error boundaries, security pass, and the new Golden Hour rebrand (incl. email templates). Below is everything still queued.

## Phase 2 — Feature completeness

### Scheduled jobs (single migration + `/api/public/cron/*` routes)
- Publish scheduled videos when `scheduled_at <= now()`.
- Expire deals: set `is_active = false` when `ends_at < now()`.
- Refresh destination AI summaries for (city, country) pairs with ≥3 videos and no recent summary.
- Nightly deal discovery re-scoring (quality / freshness).
- Recompute creator analytics rollups.

### Search (`/search`)
Extend hybrid search beyond videos to deals, destinations, creators, itineraries. Tabbed result UI.

### Map (`/map`)
Render video + deal `lat/lng` markers, cluster above 100, sync with URL bbox.

### Collections
Public discovery page, "add to collection" button on video cards, shareable links.

### Itineraries
Public visibility flag, share / export to PDF, "remix" another user's public itinerary.

### Sounds / music
Wire `music_track_id` end-to-end through `/create`; "use this sound" CTA on `/sounds/$id` deeplinks into the recorder.

### Studio
- `studio.schedule.tsx`: confirm cron flips scheduled videos to `ready`.
- `studio.links.tsx`: inject `affiliate_partners.tracking_param` into outgoing URLs.
- Video edit: deal-suggestion accept flow writes to `video_deals`.

### Business (tracking only — no money handling)
- `business.calculator.tsx`: real commission math from `commission_pct`.
- Application lifecycle: approved → unique `approved_code` → `deal_redemptions` table → dashboard reads conversions.
- Deal performance dashboard: impressions / clicks / CTR / top creators.

### Creator
- `creator.analytics.tsx`: verify charts read `video_views`, `likes`, `saves`, `affiliate_clicks` (likely needs a service-role server fn since `video_views` has no SELECT policy).
- Followers list + follower-only feed filter.

### Admin
- `admin.users.tsx`: role grant/revoke audited into `admin_actions`.
- Moderation queue: bulk actions + appeal flow (uses existing `moderation_flags.status`).
- Feature-flag table + admin toggle UI.

### Referral redirect (`/r/$code`)
Verify it logs to `deal_redirects`, increments `deal_clicks`, then 302s.

### Public profile (`/u/$username`)
Tabs (videos / collections / public itineraries / sounds), follow button, share.

## Phase 3 — Polish & ops

- Loading skeletons on feed, search, destination, profile.
- Empty states on every list (collections, notifications, applications, invites, moderation, itineraries).
- Mobile sweep at 375px: `/create`, `/studio/*`, `/business/*`, admin.
- Accessibility: video player keyboard controls, comment dialog focus trap, alt text on every `image_url` / `thumbnail_url`.
- Realtime: add `comments`, `video_views` (count only) to `supabase_realtime` if useful for live counts.
- Observability: error boundary → server-fn log surfaced in `/admin`.
- Performance: image lazy-load, tune `match_videos` / `match_deals` ivfflat indexes if cold queries are slow.
- Rebrand QA pass: visit `/`, `/login`, `/legal/*`, `/settings`, `/u/$username`, `/business`, `/studio`, `/admin` and fix any contrast/legibility regressions from the dark→light switch.

## Suggested execution order

1. Cron jobs (Phase 2) — unlocks scheduled publishing + deal expiry + fresh destination content automatically.
2. Referral redirect + business tracking lifecycle (`deal_redemptions`) — these monetisation surfaces are dead without it.
3. Creator analytics + admin moderation — power-user tools.
4. Search / map / collections / itineraries / sounds / profile — discovery & engagement surfaces.
5. Phase 3 polish as small follow-up PRs once features land.

## Explicitly excluded (deferred until Ltd + bank + Stripe)

Stripe Connect onboarding, payouts, ledger, invoicing, tax, subscriptions, boosted-deal monetisation, and creator earnings.
