# Section S — Cross-platform Import & Social Links

Goal: let creators (a) link YouTube / TikTok / Instagram / X handles to their Travidz profile, and (b) pull a specific post/video from those platforms and republish it as a Travidz video in one tap.

## UX strategy — make it irresistible

Three entry points, all funneling into the same flow:
1. **Onboarding nudge** on the Creator activation screen ("Already a creator? Import your latest 3 videos in 30 sec").
2. **`+` button → "Import from…"** tab next to "Upload" on `/create`. Big platform tiles (YouTube, TikTok, Instagram Reels, X) with logos.
3. **Studio empty state** ("No videos yet — import from YouTube") and a persistent **"Import more"** card in `/studio/videos`.

Each import flow is **paste-a-URL** (zero OAuth friction for v1):
- User pastes link → server fetches oEmbed/metadata + thumbnail → preview card → user edits title/destination/tags → "Publish to Travidz".
- For YouTube specifically, also support **"Connect channel"** (read-only) which lists their last 20 uploads as checkbox tiles for bulk import.

Profile gets a **"My links"** row of platform chips (icon + handle, tap to open). Shown publicly on `/u/$username`.

## Scope (v1)

In:
- Profile social links CRUD (YouTube, TikTok, Instagram, X, website) — free text handles, no OAuth.
- URL-paste import for YouTube + TikTok + Instagram Reels → creates a Travidz `videos` row with `source_platform`, `source_url`, `source_video_id`, fetched thumbnail, title, description.
- Choice of **Repost mode**:
  - *Link card* (default, always legal): renders an embed/thumbnail card in the feed that plays the original or deep-links out. No Mux upload.
  - *Mirror to Travidz* (only if creator confirms ownership): downloads via server-side fetch and pushes to Mux through existing `createDirectUpload` pipeline.
- YouTube "Connect channel" via Google OAuth (uses Lovable Cloud managed Google sign-in already present) + YouTube Data API key → list recent uploads, multi-select import.

Out (future):
- TikTok/Instagram OAuth (require business app review — defer).
- Auto-sync on new uploads (cron) — defer to Section T.
- Stripe Connect / monetization tie-in.

## Data model

New columns on `videos`:
- `source_platform text` ('travidz' | 'youtube' | 'tiktok' | 'instagram' | 'x')
- `source_url text`
- `source_video_id text`
- `embed_mode text` default `'mirror'` ('link_card' | 'mirror')

New table `profile_socials`:
- `user_id uuid PK ref profiles.id`
- `youtube_handle`, `youtube_channel_id`, `tiktok_handle`, `instagram_handle`, `x_handle`, `website_url` (all nullable text)
- `updated_at timestamptz`
- RLS: public read, self update/insert.

Index on `videos(source_platform, source_video_id)` to dedupe.

## Server functions (`src/lib/social.functions.ts`)

- `getMySocials()` / `upsertMySocials(input)` — profile links.
- `getPublicSocials(userId)` — for `/u/$username`.
- `previewExternalVideo({ url })` — server-side fetch:
  - YouTube → oEmbed + Data API (`videos.list` for title/desc/duration/thumb) using `YOUTUBE_API_KEY` secret.
  - TikTok → oEmbed (`https://www.tiktok.com/oembed`).
  - Instagram → oEmbed via Meta (requires `INSTAGRAM_OEMBED_TOKEN`) or fallback scrape of `og:` tags.
  Returns `{ platform, sourceId, title, description, thumbnail, duration, embedHtml }`.
- `importExternalVideo({ url, mode, destination, country, city, tags, budget_tag })` — inserts a `videos` row. If `mode='link_card'`, marks `status='ready'` immediately. If `mode='mirror'`, kicks off Mux ingest from the source URL (YouTube only, ownership-attested).
- `listMyYouTubeUploads()` (OAuth path) — calls Data API with user token, returns last 20 videos.
- `bulkImportYouTube({ videoIds[], mode })`.

## Feed rendering

`VideoCard` gains a `source_platform` badge (tiny logo chip top-left) and, when `embed_mode='link_card'`, swaps `<MuxPlayer>` for a poster + play overlay that opens the original in a sheet (YouTube iframe / TikTok embed / Instagram embed).

## UI

- `src/routes/create.tsx` → tabs `Upload | Import`. Import tab: 4 platform cards, paste field, live preview card, destination/tags form (reuses existing), Publish CTA.
- `src/routes/profile.tsx` → "My links" editor (sheet with 5 inputs + save). Public chips on `/u/$username`.
- `src/routes/studio.tsx` → "Import from YouTube" CTA card.

## Secrets to request

- `YOUTUBE_API_KEY` (Google Cloud → YouTube Data API v3, read-only, free quota).
- Optional later: `INSTAGRAM_OEMBED_TOKEN`.

TikTok oEmbed needs no key. We'll ask for `YOUTUBE_API_KEY` only after you approve the plan.

## Legal / safety

- Default mode is **link card** (embeds = compliant with each platform's TOS).
- "Mirror to Travidz" shows a mandatory checkbox: *"I own this content or have rights to republish it."* Stored on the video row.
- DMCA takedown handled via existing admin moderation (`is_hidden`).

## Build order

1. Migration: `videos` columns + `profile_socials` table + RLS.
2. `social.functions.ts` with `getMySocials`/`upsertMySocials` + `previewExternalVideo` (YouTube + TikTok first).
3. `/create` Import tab UI.
4. `VideoCard` link-card variant + platform badge.
5. Profile social links editor + public chips on `/u/$username`.
6. YouTube OAuth channel connect + bulk import (last step, after `YOUTUBE_API_KEY` is provided).

---

**Two quick decisions before I build:**
- OK to default to **link cards** (embed originals) and gate "mirror to Mux" behind an ownership checkbox? This is the safest and fastest path.
- Start with **YouTube + TikTok + Instagram** in v1, or just YouTube first?
