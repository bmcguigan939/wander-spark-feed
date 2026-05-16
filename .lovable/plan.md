## Remaining AI/LLM improvements — sequenced rollout

**Shipped:** #2 Auto-tag videos · Phase A (#1 quality scoring, #6 moderation) · **Phase B #7 Semantic search (pgvector hybrid)**.

Phase B notes (just shipped):
- pgvector enabled; `embedding vector(1536)` on `videos` and `deals` with ivfflat cosine index.
- `embedText` / `embedVideo` / `embedDeal` in `ai.functions.ts` using `openai/text-embedding-3-small` via Lovable AI Gateway.
- New videos auto-embed after `runAutoTag` (post-transcript pass). Discovery-ingested deals auto-embed on insert.
- `match_videos` / `match_deals` SQL RPCs return cosine-sim ranked ids respecting visibility rules.
- `searchVideos` is now hybrid: keyword (tsv) + semantic candidates merged with weighted score.
- Admin overview has a backfill button (25 rows/click) for legacy rows missing embeddings.

**Phase B complete:** `getForYouFeed` now builds a per-viewer taste vector by averaging embeddings of recently liked/saved videos (L2-normalized), pulls top semantic candidates via `match_videos`, merges them into the chronological pool, and adds a cosine-similarity term to `scoreVideo` so older-but-relevant videos can surface for the right user.

We've shipped **#2 Auto-tag videos**. Here's a proposed order for the remaining 9, grouped so each phase unlocks the next.

### Phase A — Quality & Trust (next up)

**#1 Smarter deal discovery scoring**
- Extend `discovery.functions.ts`: after crawling, send page text + metadata to Gemini Flash for a `quality_score` (price competitiveness, photo quality, review signals, refundability hints) + `reject_reason`.
- New columns on `deals`: `quality_score numeric`, `quality_reasons jsonb`.
- Auto-reject below threshold (e.g. <0.4) before they hit admin queue; admin sees score + reasons on borderline ones.
- Feedback loop: nightly job compares `quality_score` vs. `click_count` / conversion → log to `deal_discovery_runs` for prompt tuning.

**#6 Content moderation**
- On video `status='ready'` and on new `comments` insert, call LLM with a moderation prompt (spam, fake reviews, off-platform links, hate).
- New table `moderation_flags` (target_type, target_id, label, confidence, reason, status).
- Auto-hide above threshold via `is_hidden=true` (videos) or soft-delete (comments); admin review page lists flags.

### Phase B — Discovery & Personalization

**#7 Semantic search (pgvector)**
- Enable `vector` extension. Add `embedding vector(1536)` to `videos` and `deals`.
- Generate embeddings from title + description + transcript (videos) / title + description + city (deals) via Lovable AI Gateway embeddings.
- Hybrid search server fn: combine existing `search_tsv` keyword match with cosine similarity, rerank.
- Backfill job for existing rows; trigger on insert/update.

**#3 Personalized feed ranking** (assumed in original list — confirm)
- Score feed candidates per user using watch history, likes, saves, follows + semantic similarity from #7.
- Server fn `getRankedFeed` replaces chronological default on `/index`.

### Phase C — Creator & Business Tools

**#4 Smart deal ↔ video matching**
- Extend `video_deal_suggestions`: use #7 embeddings + city/country/category match to auto-suggest deals to attach when a creator opens a video in studio.
- Already has table — just needs population job + UI surface.

**#5 Auto-generated destination summaries**
- Already have `destination_summaries` table. Add nightly job: for each (city, country) with ≥N videos, generate summary + highlights + best_time from aggregated transcripts.
- Surface on destination pages.

**#8 AI itinerary improvements**
- `itineraries` table exists. Add server fn `generateItinerary` (Gemini) given destination + days + interests + budget; pull in real `deals` and `videos` as references.

### Phase D — Ops & Support

**#9 Auto-reply / outreach drafts**
- For new `business_invites`, generate a personalized email draft (creator's video context + business category) the creator can edit before sending.
- For `deal_applications`, draft business response based on application pitch.

**#10 RAG-powered support chat**
- Index help docs + recent deals/videos as embeddings.
- New `/support` route with streaming chat (server fn generator pattern); audience-aware system prompt (traveller vs. business).

---

### Suggested next step

Start **Phase A** in one go (both #1 and #6 share the moderation-style LLM-grader pattern and will reinforce each other in the admin UI). Estimated scope:

- 1 migration (new columns + `moderation_flags` table + RLS)
- Extend `discovery.functions.ts` + `ai.functions.ts` (add `runQualityScore`, `runModeration`)
- Admin pages: surface scores/flags
- Wire moderation trigger into mux-webhook (video ready) and comments insert

### Open questions before I start Phase A

1. **Auto-reject threshold for deals** — fully drop below 0.4, or always keep in admin queue but pre-sort?
2. **Comment moderation** — auto-hide on high confidence (>0.85) or always require admin review?
3. **Do you want me to bundle #3 personalized ranking into Phase B**, or is the chronological feed fine for now and we skip straight to semantic search as a manual search box?

Once you answer, I'll implement Phase A end-to-end.
