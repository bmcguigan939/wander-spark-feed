# Where we are

Phase 1 scaffolding is in place:

- **DB**: `profiles`, `user_roles`, `videos`, `likes`, `saves`, `follows`, `collections`, `collection_items`, `video_views` with RLS. All tables currently empty.
- **Auth**: AuthProvider + login route + role loading (`creator`/`admin` flag).
- **Server fns**: `mux`, `interactions`, `collections`, `profile`, `feed` modules wired through `requireSupabaseAuth` + `attachSupabaseAuth`.
- **Mux**: `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET` all set. Webhook route `/api/public/mux-webhook` exists.
- **Routes**: `/`, `/login`, `/create`, `/collections`, `/collections/$id`, `/profile`, `/u/$username`, `/search`.

What's missing or unverified: no end-to-end smoke test, no real uploads, feed is empty, no AI features, no deals, no business/admin surfaces.

# Plan — next pass

## A. Verify & harden Phase 1 (quick)

1. **End-to-end smoke**: sign up → become creator → upload a short clip → confirm Mux webhook flips `status` to `ready` → confirm feed renders it → like/save/add-to-collection → public profile shows it. Fix any breakage found (most likely: webhook signature header parsing, RLS on insert, XHR upload CORS).
2. **Empty states**: feed, collections list, profile tabs, search all need decent empty states + skeletons.
3. **Mobile polish**: confirm `VideoCard` autoplay/intersection observer, right-rail tap targets, bottom-nav safe-area on iOS.
4. **SEO/meta per route**: add `head()` to `/`, `/u/$username` (creator name), `/collections/$id`.

## B. Phase 2 — AI + content depth

1. **AI auto-tagging on upload** using Lovable AI Gateway (`google/gemini-2.5-flash`):
   - On webhook `video.asset.ready`, kick off a server fn that pulls Mux thumbnail + title/description, asks the model for `{country, city, activity_tags[], budget_tag, suggested_title}`.
   - Writes back to `videos`; creator can override in `/create` step 2 or from `/profile`.
2. **Transcription + captions**: enable Mux auto-generated captions; surface as overlay toggle on `VideoCard`.
3. **Destination pages** (`/d/$country`, `/d/$country/$city`): SSR-friendly, list videos + collections for that place. Good for SEO.

## C. Phase 3 — Deals + business

1. **Deals table** (`deals`: creator_id, video_id, title, provider, url, price_cents, currency, valid_until) + RLS.
2. Show "View deal" CTA on `VideoCard` when present; click logs to `deal_clicks` for analytics.
3. **Business portal** (`/business`): role-gated, lets a business user attach deals to their own videos. (Stripe Connect deferred.)

## D. Out of scope this round

In-app video editor, map view, PWA install, admin moderation dashboard, Stripe payouts.

## What I need from you

Pick the starting point:

- **(A) Verify & harden first** — recommended; we don't ship Phase 2 on top of unverified Phase 1.
- **(B) Jump to AI auto-tagging** — assume Phase 1 works, fix as we go.
- **(C) Jump to Deals/Business** — same assumption.

## Technical notes

- AI tagging runs inside the webhook handler as a fire-and-forget `ctx.waitUntil`-style call so webhook stays <1s.
- Destination pages use `supabaseAdmin`-backed public server fns (no auth needed), so loaders are SSR-safe.
- Deals RLS: creators insert/update/delete their own; public read where `valid_until > now()`.
