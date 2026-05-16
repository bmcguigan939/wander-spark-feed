## What's already built

Travel-video app on TanStack Start + Lovable Cloud. Working today:

- Auth (email + Google) with `traveller` / `creator` / `business` roles
- Creator upload → Mux ingest → auto-tag (Lovable AI) → auto-captions → transcript re-tag
- Vertical feed with Mux Player + CC toggle, likes, saves, collections, share
- Search (now transcript-aware), Destinations browse, Profiles
- Business portal: apply, deals CRUD, deal detail with click sparkline
- Public deal pages with click tracking

## What's still missing

Five gaps, ordered by user impact:

### 1. Comments (highest impact — UI button already exists and toasts "coming soon")
- `comments` table: id, video_id, user_id, body, parent_id (nullable for replies), created_at
- RLS: public read, auth insert, owner update/delete
- `comment_count` denormalized on `videos` + trigger (mirrors like/save)
- Bottom sheet on `VideoCard` listing comments + composer; reuse `AddToCollectionSheet` shape
- Realtime subscribe on the open video's comments channel

### 2. Follows are half-built
- `follows` table + RLS exist, but no UI
- Add Follow/Unfollow button to `u.$username.tsx`
- "Following" tab on the feed (filter by followed creators)
- Follower counts on profile page

### 3. Notifications
- `notifications` table: user_id, type (like/comment/follow/deal_match), actor_id, video_id, deal_id, read_at
- Triggers on `likes`, `comments`, `follows` insert → write a notification row
- Bell icon in top nav + `/notifications` route + realtime badge

### 4. Business analytics depth
- Currently only click sparkline per deal
- Add: impressions logging in `VideoCard` when a video with a matched deal becomes active
- Funnel view: impressions → clicks → conversion rate, per deal and per referring video
- Top-referring creators list per deal

### 5. Polish & ops
- Creator's own video page with "Re-run AI tagging" button (calls existing `autoTagVideo`)
- Empty states across feed/search/collections (some are bare)
- Email notifications for business deal applications (Resend via Lovable Cloud)
- Onboarding: first-run role picker for new signups (currently defaults to `traveller`)

## Recommended sequencing

```text
Phase 1 — Engagement (1 step)
  └─ Comments

Phase 2 — Social graph (1 step)
  ├─ Follow button + follower counts
  └─ "Following" feed tab

Phase 3 — Retention (1 step)
  └─ Notifications (depends on comments + follows existing)

Phase 4 — Business value (1 step)
  └─ Impression logging + funnel analytics

Phase 5 — Polish (parallelizable)
  ├─ Re-run AI tagging button
  ├─ Empty states
  ├─ Business email notifications
  └─ Role onboarding
```

Each phase is ~1 implementation turn. Phases 1→4 are strictly ordered (each unlocks the next); Phase 5 items are independent and can be picked off anytime.

## My recommendation

Start with **Phase 1 (Comments)** — it's the most visible gap (the button is already in the UI promising it) and unblocks Phase 3.

Reply with "go" to start Comments, or name a different phase / item to jump to.