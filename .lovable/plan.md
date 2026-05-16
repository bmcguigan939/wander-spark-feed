
# Revised Plan — Skip Perplexity (Firecrawl + Lovable AI only)

We swap Perplexity for **Firecrawl's `search` endpoint**, which returns ranked web results with optional inline scraping. Lovable AI (`google/gemini-3-flash-preview`) still validates and structures every candidate. Everything else from the approved plan stays the same.

## What changes

### Discovery pipeline (background cron + inline `suggestDealsForVideo`)

Before:
```text
Perplexity (sonar) ─▶ candidate URLs ─▶ Firecrawl scrape ─▶ Gemini extract
```

After:
```text
Firecrawl search(query, scrapeOptions:{formats:['markdown']})
        │  returns ranked results WITH markdown already populated
        ▼
Filter to affiliate-friendly domains (booking, getyourguide, viator,
   tiqets, klook, expedia) + dedupe by canonical URL
        ▼
Gemini extract → {title, price, currency, city, country, activity_tags,
                  ai_summary, ai_confidence}
        ▼
Insert into deals (status='approved' if ai_confidence ≥ 0.75
                   else 'pending_review')
```

A single `firecrawl.search()` call returns 10 ranked results with markdown bodies — same effective coverage as Perplexity+Firecrawl two-step, in one network round trip.

### Query templates

`runDiscoveryCycle()` (cron) iterates over a rotating list of seed queries, e.g.:
- `"best things to do in Lisbon site:getyourguide.com OR site:viator.com"`
- `"top tours Bali site:klook.com OR site:tiqets.com"`

`suggestDealsForVideo({videoId})` builds the query from the video's destination:
- `` `things to do in ${city || destination} ${activity_tags.slice(0,2).join(' ')} site:getyourguide.com OR site:viator.com OR site:tiqets.com` ``

If fewer than 3 hits, broaden by dropping the `site:` filter.

### Affiliate network inference

Without Perplexity citations we infer `affiliate_network` from the result URL hostname:
- `getyourguide.com` → `getyourguide`
- `viator.com` → `viator`
- `booking.com` → `booking`
- `tiqets.com` → `tiqets`
- `klook.com` → `klook`
- `expedia.*` → `expedia`
- anything else → `null` (still ingested but no commission wrapping)

### Secrets

- ~~`PERPLEXITY_API_KEY`~~ (skipped)
- `FIRECRAWL_API_KEY` — requested via `add_secret`
- `LOVABLE_API_KEY` — already present

### Cost

Lower than the original plan. One Firecrawl `search` call (with scraping) ≈ $0.01–0.02, replacing one Perplexity call + 2 Firecrawl scrapes. Same 60/hour live-search cap, same admin moderation queue.

## What is unchanged

Everything else from the approved plan stands:
- Migration already applied (deals columns, video_deals, video_deal_suggestions, deal_discovery_runs, affiliate_partners).
- Affiliate wrapper already shipped.
- Steps 4–7 build order is identical: `discovery.functions.ts` → `video-deals.functions.ts` → Smart Deals sheet → Book-this-trip row + admin queue.
- No price markup. Human approval for AI deals (auto-approved only when creator attaches inline).

## Trade-offs

- **Lose**: Perplexity's natural-language synthesis and citation ranking. Firecrawl search is plain SERP — slightly noisier candidates.
- **Win**: One fewer API key, one fewer vendor dependency, simpler error surface, lower per-call cost.
- We can add Perplexity back later behind a feature flag if Firecrawl-only quality is insufficient.

## Ready to resume

I'll continue from **Step 3 (request `FIRECRAWL_API_KEY` only)** and proceed through Steps 4–7. Approve to continue.
