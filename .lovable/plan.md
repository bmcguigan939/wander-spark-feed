
# Upload-first creator flow with social cross-links

Yes — this will work, and it actually simplifies what's there today. The native upload path already plays in feed/search via Mux, already overlays deals (`matchedDeal` + `attachedDeals`), and already feeds analytics. We just need to make Upload the primary path, treat social URLs as metadata on the same video row, and quietly retire the "link card" import as the main entry point.

## How it works after the change

```text
Creator opens Create
        ↓
  [Upload from device]  ← primary, required
        ↓
  Video uploads to Travidz → Mux processes → status=ready
        ↓
  Optional: paste links to the same post on Instagram / TikTok /
            Facebook / YouTube (stored as cross-links on the row)
        ↓
  Optional: attach deals (Smart Deals sheet)
        ↓
  Published → appears in For You feed + Search automatically
              plays natively, deals overlay shown,
              "Also on Instagram ↗" chips link out
```

Businesses see the same video in search/feed and can apply the existing partnership flow (`deal_applications` → approved code → `video_deals`).

## What to restructure

### 1. Create page (`src/routes/create.tsx`)
- Make **Upload** the default and only primary tab.
- Demote the "Import from socials" tab to a small secondary action *inside* the upload flow titled "Add links to this video on other platforms" (optional, multi-input for IG / TikTok / FB / YT / X).
- Remove the bulk URL importer from the main UI (keep the server fn for admin/migration use only).

### 2. Videos table — store cross-links as metadata, not as the source
The current row already has `source_platform`, `source_url`, `embed_mode`. Reuse them for a new "cross-link" concept on top of the native upload:
- Add a `cross_links jsonb` column on `videos` shaped like `[{ platform, url }]` (up to ~5 entries, validated).
- Keep `mux_playback_id` as the source of truth for playback. `embed_mode = "native"` for these rows; `link_card` rows become legacy.
- Migration also: backfill the two existing Instagram `link_card` rows by either (a) asking the creator to re-upload, or (b) hiding them from feed/search until they do.

### 3. Feed + search ranking (`src/lib/feed.functions.ts`)
- Remove the `metaImportBoost` for `link_card` (no longer needed — native uploads rank normally on freshness + engagement).
- Add a small "new creator upload" freshness boost so first-time native uploads surface in For You within the first 24h instead of being buried by seeded data.
- Drop the link-card branches in `searchVideos` / search results.

### 4. Video card (`src/components/feed/VideoCard.tsx`)
- Always render the Mux player (no more link-card placeholder branch as the default).
- Below the title, render a row of small platform chips from `cross_links`: "Watch on Instagram ↗", "On TikTok ↗", etc. Tapping opens the external post in a new tab; the Travidz card keeps playing.
- Keep the existing deal overlay (`matchedDeal` + `attachedDeals`) — no change.

### 5. Studio video editor (`src/routes/studio.videos.$id.tsx`)
- Add a "Cross-links" panel to add/remove the per-platform URLs after publishing.
- Keep the existing Smart Deals + Tag Business panels.

### 6. Profile (`src/routes/u.$username.tsx`)
- Keep `profile_socials` (handles) as the account-level social links — separate from per-video cross-links.
- On a video tile, show the per-video platform chips when present.

### 7. Business + contract flow — no schema change
- `deal_applications` → approve → `video_deals` already works end-to-end.
- The only addition: when a business browses creators, the creator card shows both their Travidz video count and their cross-linked socials, so businesses can evaluate reach before approving.

## Trade-offs to be aware of

- **Storage + Mux cost** rises because every video is hosted. This is the cost of having deals overlay during playback — it can only happen on video Travidz controls.
- **Existing imported link-card rows** (the two Instagram videos) won't have a Mux asset. Options: (a) ask the creator to re-upload, (b) keep them visible only on the creator's profile as "external" cards, (c) hide them. Recommend (a) + (b) as fallback.
- **No scraping** — Instagram/Facebook still cannot be auto-downloaded; the upload must come from the creator's device. This was already the constraint.

## Files that change

- `src/routes/create.tsx` — upload-first UI, cross-links sub-form.
- `src/components/feed/VideoCard.tsx` — drop link-card branch, add cross-link chips.
- `src/lib/feed.functions.ts` — remove meta-import boost, add new-upload freshness boost, select `cross_links`.
- `src/routes/search.tsx` — render cross-link chips, drop link-card placeholder.
- `src/routes/studio.videos.$id.tsx` — Cross-links panel.
- `src/lib/social.functions.ts` — keep `previewExternalVideo` for the link-input previews; mark `importExternalVideo*` as legacy (still callable for migration).
- New migration: add `videos.cross_links jsonb default '[]'` + check constraint on shape.
- New server fn: `updateVideoCrossLinks(videoId, links[])` with creator auth + validation.

## Out of scope

- Auto-publishing the same video to the creator's actual Instagram / TikTok accounts. That requires per-platform OAuth + Graph API approvals; out of scope here. Cross-links are creator-supplied URLs to posts they uploaded themselves.
