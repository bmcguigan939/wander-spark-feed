## What's actually wrong

Linda's "Devon" Instagram import is in the database with `status='ready'`, `is_draft=false`, `is_hidden=false`, `embed_mode='link_card'`. It DOES appear in the feed and in search (it's the top-left tile in the screenshot) — but the card is blank because `thumbnail_url` is empty.

Root cause: Instagram serves a login wall to server-side fetches, so `previewByOgTags` couldn't extract `og:image`/`og:title`. The row was inserted with the title Linda typed and an empty thumbnail.

## Fix

### 1. Better Instagram/Facebook preview fallback (`src/lib/social.functions.ts`)

Add a two-step preview chain for Instagram and Facebook:

- **Step A – Instagram oEmbed via Facebook Graph** (only if `FACEBOOK_OEMBED_TOKEN` env is set). Returns `thumbnail_url`, `title`, `author_name`.
- **Step B – Reader proxy fallback**: fetch `https://r.jina.ai/https://www.instagram.com/...` (free, no key). It returns markdown with the post text and the image URL — parse the first image and the first text line for title.
- **Step C – Existing `previewByOgTags`** as last resort.

If all three fail to produce a thumbnail, set `thumbnail = null` and let the UI render a branded placeholder.

Apply the same chain for Facebook links (oEmbed → reader → og tags).

### 2. Branded placeholder for blank cards

- `src/components/feed/VideoCard.tsx`: when `mux_playback_id` is null and `thumbnail_url` is null, replace the white `Play` icon background with a gradient tinted by `source_platform` (Instagram pink/orange, TikTok cyan/red, Facebook blue, YouTube red, default neutral) and overlay the platform icon + title text so the tile is recognisable.
- `src/routes/search.tsx` and any grid/tile that shows imported videos: same fallback — use a small helper `getPlatformPlaceholder(source_platform)` that returns a Tailwind gradient class + Lucide icon. Search results currently render a blank white box; this gives them visual identity.
- Add the helper as a tiny shared module `src/lib/platform-style.ts` so feed, search, grid, and `u.$username` all use it.

### 3. Let importers paste their own thumbnail URL

In the "Import videos (no link)" sheet on `src/routes/profile.tsx`, the bulk form already calls `importExternalVideosBulk` and gets back per-URL results. After import, if any returned row has no thumbnail, show those rows inline with a "Paste image URL" field that calls a new tiny server fn `setImportedThumbnail({ videoId, url })` (admin-checked: `creator_id = auth.uid()`). Stored straight into `videos.thumbnail_url`.

This also covers the single `importExternalVideo` form on `src/routes/create.tsx`: the existing `thumbnail` input is already wired, just surface a clearer "Optional — we couldn't fetch one automatically" hint when the preview returns null.

### 4. Backfill Devon

Run a one-off update via migration or admin action to set `thumbnail_url` for the existing row to whatever the new reader-proxy fallback returns (or leave null so the new gradient placeholder shows). Easiest: re-run the preview against the stored `source_url` for any video where `embed_mode='link_card' AND thumbnail_url IS NULL`, inside a new admin server fn `repairBlankImportedThumbnails` callable from `src/routes/admin.seed.tsx`.

## Out of scope

- Real Instagram/Facebook auto-sync (still requires Meta Graph API + Business account; documented earlier).
- Server-side rendering of an actual video preview (Instagram blocks this).
- Changing feed ranking — the row already qualifies, it just looks blank.

## Verification

- Import a fresh Instagram reel → preview returns a thumbnail (via reader proxy) or, if not, the import succeeds and the card shows a branded gradient tile, not a white blank.
- Devon's existing card in feed + search shows either a real thumb or the new placeholder.
- Admin "Repair blank thumbnails" button updates all `link_card` rows with missing thumbs.
- No regression for YouTube/TikTok (they use their own oEmbed paths).
