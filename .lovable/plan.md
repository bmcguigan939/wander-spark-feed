
# Travidz AI Deal Engine — Legitimate v2

Two complementary surfaces, sharing one AI discovery pipeline:

1. **Background discovery** — cron-driven, fills `/deals` and the global feed.
2. **Inline "Smart Deals for this video"** — when a creator posts, AI instantly finds matching bookable deals for that destination so the creator can attach them in one tap. Viewers see a *Book this trip* row directly under the video.

This is the addition that makes it *appealing* — every video becomes shoppable, with zero work for the creator.

```text
Creator uploads video ─▶ AI tags destination (existing)
                              │
                              ▼
                ┌──────────────────────────────┐
                │ findDealsForVideo()          │  ← new
                │  • check existing approved   │
                │    deals matching dest/tags  │
                │  • if <3 hits, live-search   │
                │    Perplexity + Firecrawl    │
                │  • rank, dedupe, wrap with   │
                │    Travidz affiliate IDs     │
                └──────────────┬───────────────┘
                               ▼
                ┌──────────────────────────────┐
                │ Create screen → "Suggested   │
                │ deals" sheet. Creator toggles│
                │ which to attach (default all │
                │ on, max 3).                  │
                └──────────────┬───────────────┘
                               ▼
                video_deals(video_id, deal_id, position)
                               │
                               ▼
        VideoCard shows "Book this trip" row
        with per-deal "Book now" → /api/public/go/...
```

---

## 1. Database (one migration)

Extend `deals`:
- `source text` — `'manual' | 'ai_discovered' | 'affiliate_import'`
- `status text` — `'pending_review' | 'approved' | 'rejected' | 'expired'`
- `affiliate_network text` — `'booking' | 'getyourguide' | 'viator' | 'tiqets' | 'klook' | 'expedia' | null`
- `original_url text` — supplier URL pre-wrapping
- `ai_confidence numeric`
- `ai_summary text`
- `discovered_at timestamptz`
- `last_seen_at timestamptz`
- `business_id` becomes nullable (AI rows have no business owner)

New tables:
- `video_deals(video_id, deal_id, position, attached_at, attached_by)` — many-to-many linking videos to attached deals. RLS: creator can manage rows for their own videos; public read when both video and deal are public/approved.
- `deal_discovery_runs(id, started_at, finished_at, query, candidates_found, inserted, skipped_duplicate, errors jsonb)` — observability.
- `affiliate_partners(network unique, display_name, commission_pct, tracking_param, tracking_value, enabled)` — admin-managed.
- `video_deal_suggestions(video_id, deal_id, score, suggested_at)` — caches the AI's top picks per video so the Create screen sheet loads instantly and the same picks survive a refresh.

RLS:
- `deals` public read where `status='approved' AND is_active`.
- `video_deals` public read when the parent video is publicly readable.
- AI-discovered deals are insertable only by service role (cron + serverFn).

## 2. Server functions / routes

| File | Purpose |
|---|---|
| `src/lib/discovery.functions.ts` | `runDiscoveryCycle()` — cron orchestrator |
| `src/lib/discovery.functions.ts` | admin: `listPendingDeals`, `approveDeal`, `rejectDeal`, `bulkApprove` |
| `src/lib/video-deals.functions.ts` | `suggestDealsForVideo({videoId})` — main new fn |
| `src/lib/video-deals.functions.ts` | `attachDealToVideo`, `detachDealFromVideo`, `reorderVideoDeals` |
| `src/lib/affiliate-wrapper.ts` | `wrapWithAffiliate(url, network)` |
| `src/routes/api/public/cron/discover-deals.ts` | pg_cron entrypoint (apikey-authed) |
| `src/routes/admin.discoveries.tsx` | moderation queue |

### `suggestDealsForVideo` flow (the new magic)

1. Load video — require `destination`, `country`, `city`, `activity_tags`. If missing, return empty list with a friendly "We'll suggest deals once we know the destination" state (auto-tag already runs on upload, so this is rare).
2. Query existing `deals` where `status='approved'` and ANY of:
   - `city ILIKE video.city`
   - `country ILIKE video.country` and activity overlap
   - `destination` fuzzy-matches
   Sort by activity-tag overlap × freshness × `ai_confidence`. Take top 5.
3. If fewer than 3 hits, **live-search**: run a targeted Perplexity query scoped to affiliate-friendly suppliers for `{city}`, scrape with Firecrawl, validate with Lovable AI (`Output.object`), and insert as `status='approved'` only if `ai_confidence ≥ 0.75` (high bar for inline-suggested deals; weaker candidates fall back to the moderation queue). Otherwise insert as `pending_review`.
4. Cache the final top-3 in `video_deal_suggestions`.
5. Return `{ suggestions: Deal[], reusedExisting: boolean }`.

Rate guard: max 1 live-search per video, max 60 live-searches/hour globally. Suggestions older than 24h are recomputed on next view.

## 3. Create screen integration (`src/routes/create.tsx`)

After Mux upload completes and auto-tag finishes (existing flow):

```text
┌──────────────────────────────────────────┐
│  ✨ Smart deals for Lisbon               │
│  We found 3 bookable experiences         │
│  travelers might want from your video.   │
│                                          │
│  ☑ Lisbon Food Tour — €45  [GetYourGuide]│
│  ☑ Sintra Day Trip — €89   [Viator]      │
│  ☑ Tagus Sunset Sail — €35 [Tiqets]      │
│                                          │
│  Earn ~6% commission on bookings • [?]   │
│  [Skip]            [Attach selected]     │
└──────────────────────────────────────────┘
```

- Sheet opens automatically once `destination` is resolved; non-blocking — creator can skip and post immediately.
- "Earn ~6% commission" — only shown if the creator has the `creator` role and the deal has a network with commission_share enabled. Existing `deal_applications` flow handles split tracking via `creator_id` on `deal_clicks`.
- Default all suggestions checked (research shows opt-out attach rates 5–10× higher than opt-in for this pattern).
- Tapping a card opens a preview drawer (price, supplier, image, full URL) so the creator can vet before attaching.
- Manual override: "Search for a different deal" → small search input that re-runs `suggestDealsForVideo` with a custom keyword.

## 4. Viewer experience (`VideoCard.tsx`)

Below the existing creator strip, add a **Book this trip** row when `video_deals` exist:

```text
🎒 Book this trip
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Food Tour│ │ Sintra   │ │ Sunset   │
│  €45     │ │  €89     │ │  €35     │
│ [Book →] │ │ [Book →] │ │ [Book →] │
└──────────┘ └──────────┘ └──────────┘
        Travidz earns commission · ⓘ
```

- Horizontal scroll, swipe-native, matches existing card aesthetics.
- "Book →" hits `/api/public/go/$id?v={videoId}` → existing redirector → supplier site. Click logged in `deal_clicks` with `referrer_video_id` so creator analytics and deal analytics already work.
- Tap ⓘ → small disclosure sheet: *"Prices set by the supplier. Travidz may earn a commission. We never add fees."*

## 5. Background discovery (unchanged from v1)

Same `runDiscoveryCycle()` cron every 4 hours filling `/deals`, but now it also benefits the inline flow: as the catalog grows, fewer videos need live-searches, lowering API spend.

## 6. Compliance (unchanged)

- No price modification.
- Affiliate disclosure on `/deals`, on video Book-this-trip row, and in `/legal/affiliate-disclosure`.
- All inline-suggested deals must hit `ai_confidence ≥ 0.75`; weaker ones go to admin queue.
- We never claim supplier inventory or process payment ourselves.

## 7. Secrets

- `PERPLEXITY_API_KEY` (request via `add_secret`)
- `FIRECRAWL_API_KEY` (request via `add_secret`)
- `LOVABLE_API_KEY` (present)
- Per-network IDs as we get approved: `BOOKING_AFFILIATE_ID`, `GETYOURGUIDE_PARTNER_ID`, `VIATOR_MCID` — `affiliate_partners` table holds whichever are set; missing ones simply don't wrap and the link goes through bare (still legal, just no commission).

## 8. Costs guard

Live-search per video: ~$0.01 (1 Perplexity + 2 Firecrawl scrapes + 1 Gemini call). Cap at 60/hour = $14/day worst case. Cached suggestions + growing approved catalog drive this toward zero.

## 9. What we are NOT doing

- No price markup, hidden or otherwise.
- No auto-attach without creator confirmation (v1) — creator always sees the sheet and taps "Attach selected".
- No auto-publish of AI deals to global `/deals` without admin approval (v1); inline-attached deals are auto-approved because the creator implicitly vetted them.

## 10. Build order (7 atomic steps)

1. **Migration:** `deals` columns + `video_deals` + `video_deal_suggestions` + `deal_discovery_runs` + `affiliate_partners` + RLS.
2. **Affiliate wrapper** + seed `affiliate_partners` (Booking, GetYourGuide, Viator placeholders).
3. **Request secrets:** `PERPLEXITY_API_KEY`, `FIRECRAWL_API_KEY` via `add_secret`.
4. **`discovery.functions.ts`** + `/api/public/cron/discover-deals.ts` + pg_cron job.
5. **`video-deals.functions.ts`** with `suggestDealsForVideo` (existing-catalog path first; add live-search second).
6. **Create-screen "Smart deals" sheet** + manual search fallback.
7. **Viewer "Book this trip" row** in `VideoCard` + `AffiliateDisclosure` component + `/legal/affiliate-disclosure` route + admin `/admin/discoveries` moderation queue.

Steps 1–4 deliver the catalog. Steps 5–7 deliver the appealing creator+viewer experience.
