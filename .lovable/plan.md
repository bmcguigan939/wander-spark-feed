## Fix blank Instagram thumbnails in Studio (no auto-downloading)

We will **not** auto-download Instagram videos — it violates Instagram's ToS and gets the platform DMCA'd. Imports stay as link-cards; we just stop rendering a blank pink box.

### Changes

1. **`src/lib/studio.functions.ts`** — add `source_platform` to the `videos` SELECT in `listStudioVideos` and to the `StudioVideo` type. Same addition to the single-video SELECT around line 166 (used by the detail page).

2. **`src/routes/studio.videos.tsx`** (line 187-189) — replace the bare `bg-secondary` div with a small `<Thumb>` helper: when `thumbnail_url` exists, render `<img>`; otherwise render a div with `getPlatformStyle(v.source_platform).gradient` and the platform's Lucide icon centred (`Instagram`, `Youtube`, `Music2`, `Facebook`, `Twitter`, `Globe` fallback).

3. **`src/routes/studio.videos.$id.tsx`** (line 173) — same `<Thumb>` swap for the hero tile.

4. **`src/routes/create.tsx` `ImportFlow`** — after a successful preview, if `preview.thumbnail` is null AND `preview.platform` is `instagram`/`facebook`, show an inline hint above the form: "We couldn't fetch Instagram's preview. Paste an image URL, or use the Upload tab to host the video on Travidz instead." Add a small `<input>` bound to a `customThumb` state; pass `thumbnail: customThumb || preview.thumbnail` into the existing `importExternalVideo` call (server fn already accepts `thumbnail`).

5. **Repair existing Devon row** — call the existing `repairBlankImportedThumbnails` admin action (already wired on `admin.seed.tsx`). No code change; just mention in the closing summary so the user runs it.

### Out of scope

- Auto-downloading or re-hosting Instagram/Facebook media (ToS + IP-ban risk).
- Changing the link-card embed model.
- New OAuth / Meta Graph integration.

### Verification

- Studio list and detail tiles for Devon + "instagram post" show an Instagram gradient + IG icon instead of a blank pink box.
- New Instagram import with no auto-thumb prompts for a manual image URL and the import still succeeds with that thumb.
- YouTube / TikTok imports (which already return thumbs) render unchanged.
