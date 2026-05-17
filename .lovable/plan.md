
# Travidz — completion plan (payments deferred)

Skipping Stripe Connect, payouts, invoicing, and creator earnings statements until the Ltd is registered. Everything else below.

## Phase 0 — Hot fix (do first, ~1 migration)

**Missing foreign keys breaking PostgREST joins.** Live error: `Could not find a relationship between 'video_deals' and 'deals'`. Add FKs on every relational table so embedded selects (`select("...,deal:deals(...)")`) work:

- `video_deals.video_id → videos.id`, `video_deals.deal_id → deals.id`
- `video_deal_suggestions.video_id → videos.id`, `.deal_id → deals.id`
- `video_business_suggestions.video_id → videos.id`
- `comments.video_id → videos.id`, `comments.parent_id → comments.id`, `comments.user_id → profiles.id`
- `likes.video_id`, `likes.user_id`; `saves.video_id`, `saves.user_id`
- `follows.creator_id`, `follows.follower_id` (→ profiles.id)
- `collection_items.collection_id → collections.id`, `.video_id → videos.id`
- `collections.owner_id → profiles.id`, `collections.cover_video_id → videos.id`
- `notifications.user_id/actor_id → profiles.id`, `.video_id`, `.comment_id`, `.deal_id`
- `business_invites.creator_id/accepted_business_id/existing_business_id → profiles.id`, `.video_id`, `.accepted_deal_id`
- `deal_applications.deal_id`, `.creator_id`, `.business_id`, `.decided_by`
- `affiliate_links.creator_id`, `.video_id`; `affiliate_clicks.link_id`, `.referrer_video_id`, `.user_id`
- `deal_clicks.deal_id`, `.creator_id`, `.user_id`, `.referrer_video_id`; same for `deal_impressions`
- `video_views.video_id`, `.user_id`
- `videos.creator_id → profiles.id`, `.music_track_id`
- `moderation_flags.resolved_by → profiles.id`
- `itineraries.user_id → profiles.id`
- `profile_socials.user_id → profiles.id` (and PK)

Cascade rules: `ON DELETE CASCADE` for child rows that lose meaning without parent (likes, saves, comments, collection_items, video_deals, deal_impressions, deal_clicks, affiliate_clicks, video_views, notifications). `ON DELETE SET NULL` for soft pointers (referrer_video_id, music_track_id, cover_video_id, decided_by, resolved_by).

Then sweep all `*.functions.ts` for embedded-select syntax (`alias:other_table(...)`) and verify each now resolves.

## Phase 1 — Launch blockers

1. **Legal pages** — DONE. Routes under `/legal/*` (terms, privacy, cookies, creator-agreement, business-agreement, dmca) + shared `LegalPage` layout + index at `/legal`. Login page links to terms + privacy.
2. **Notifications wiring** — DONE. Insert triggers attached in Phase 0; `notifications` + `comments` added to `supabase_realtime`; `NotificationsBell` subscribes to inserts.
3. **Rate limiting & abuse on open-insert tables** — DONE. Dropped the `with check: true` policies on `deal_clicks`, `deal_impressions`, `affiliate_clicks`, `video_views`. All inserts now flow through service-role server fns (`recordDealClick`, `recordDealImpression`, `/api/public/go/$id`, `/api/public/d/$id`). `comments` already required auth. Per-IP throttling deferred until traffic warrants it.
4. **Account lifecycle** — DONE. `/settings` route with "Download my data" (server fn `exportMyData` returning a JSON blob) and "Delete my account" (server fn `deleteMyAccount` — wipes owned rows then calls `auth.admin.deleteUser`). Linked from the profile sheet.
5. **SEO sweep** — partial. `sitemap.xml` and `robots.txt` server routes added (dynamic entries for deals, destinations, creators, itineraries, public collections, sounds). Per-route `head()` already exists on most public leaf routes; remaining polish (og:url + canonical on every leaf, og:image on dynamic routes) deferred.
6. **Error & 404 boundaries** — no per-route loaders in use; `__root` already supplies `notFoundComponent` + `errorComponent`. Considered done until loaders are introduced.
7. **Onboarding** — already in place: `/welcome` exists with role picker and is guarded by `beforeLoad` session check.
8. **Email**: verify auth templates render with brand, transactional templates exist for invite/application/moderation, unsubscribe page works.
9. **Security pass.** Run `supabase--linter` + `security--run_security_scan`, triage findings, update security memory.

## Phase 2 — Feature completeness

**Cron / scheduled jobs** (single migration with pg_cron + `/api/public/cron/*` routes secured by signed token):
- Publish scheduled videos when `scheduled_at <= now()`.
- Expire deals: `is_active=false` when `ends_at < now()`.
- Refresh destination summaries for (city, country) with ≥3 videos and no recent summary.
- Refresh deal discovery quality re-scoring nightly.
- Recompute creator analytics rollups.

**Search (`/search`).** Extend hybrid search beyond videos: also search deals, destinations, creators, itineraries. Tabbed result UI.

**Map (`/map`).** Render `lat/lng` markers for videos + deals; cluster >100; sync with URL bbox.

**Collections.** Public collections discovery page, "add to collection" button on video cards, share link.

**Itineraries.** Public visibility flag + share/export to PDF; "remix" another user's public itinerary.

**Sounds / music.** Wire `music_track_id` end-to-end in `/create`; "use this sound" CTA on `/sounds/$id` deeplinks to recorder.

**Studio.**
- `studio.schedule.tsx`: ensure cron flips scheduled videos.
- `studio.links.tsx`: inject `affiliate_partners.tracking_param` into outgoing URLs.
- Video edit: deal-suggestion accept flow lands in `video_deals`.

**Business.**
- `business.calculator.tsx`: real commission math from `commission_pct` splits.
- Application lifecycle: approved → unique `approved_code` → redemption table (`deal_redemptions`) → business dashboard reads conversions. (Tracking only — money handling stays out until payments phase.)
- Deal performance dashboard (impressions / clicks / CTR / top creators).

**Creator.**
- `creator.analytics.tsx`: verify charts read from `video_views`, `likes`, `saves`, `affiliate_clicks`. May need a service-role server fn since `video_views` has no SELECT policy.
- Followers list, follower-only feed filter.

**Admin.**
- `admin.users.tsx`: role grant/revoke audited to `admin_actions`.
- Moderation queue: bulk actions, appeal flow (`moderation_flags` already has `status`).
- Feature-flag table + admin toggle UI.

**Referral redirect (`/r/$code`).** Verify it logs to `deal_redirects` + increments `deal_clicks` then 302s.

**Profile (`/u/$username`).** Tabs: videos / collections / public itineraries / sounds; follow button; share.

## Phase 3 — Polish & ops

- Loading skeletons on feed, search, destination, profile.
- Empty states on every list (collections, notifications, applications, invites, moderation, itineraries).
- Mobile sweep at 375px: `/create`, `/studio/*`, `/business/*`, admin.
- A11y: video player keyboard controls, comment dialog focus trap, alt text on every `image_url` / `thumbnail_url`.
- Realtime: add `comments`, `notifications`, `video_views` (count only) to `supabase_realtime`.
- Observability: error boundary → server-fn log; surface in `/admin`.
- Performance: image lazy-load, `match_videos` / `match_deals` ivfflat tuning if cold.

## Out of scope (deferred until Ltd + bank + Stripe)

- Stripe Connect onboarding for businesses and creators
- Payouts, ledger, payment statements
- Invoicing, tax (VAT / 1099) handling
- Subscription / boosted-deal monetization

---

## Suggested execution order

1. Phase 0 (1 migration, unblocks studio immediately).
2. Phase 1 §2 + §3 + §1 (notifications wiring, rate limiting, legal) — these gate any public launch.
3. Phase 1 §4–§9 in parallel.
4. Phase 2 grouped by surface area (cron + business → creator → traveller → admin).
5. Phase 3 throughout as polish PRs.

Want me to kick off Phase 0 now?
