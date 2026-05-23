
## Goal

Make it effortless for a creator to (1) save their social profile links once, and (2) immediately after publishing a Travidz video, copy the Travidz link and jump straight into Instagram / TikTok / YouTube / Facebook / X to paste it into their bio, caption, or story — so their existing followers land on the Travidz video feed, where bookings and area recommendations are wired up.

The destination URL already works today: `/?v=<videoId>` deep-links into the feed with the video, its attached deals and the area-based "for you" feed. We're not changing that — only the social hand-off around it.

## What we'll build

### 1. New "Share to your socials" step after publish

After `finalizeM` succeeds in `src/routes/create.tsx`, replace the immediate redirect with a small success card that shows:

- The Travidz video URL (read-only input + Copy button + native Share button)
- A QR code (rendered client-side, no new deps if `qrcode.react` is added — single ~12 KB package) for stories / printed media
- A row of platform buttons (Instagram, TikTok, YouTube, Facebook, X) that:
  - Copy the URL to the clipboard
  - Open the platform — preferring the creator's saved profile URL (so they land directly on their own Instagram/TikTok page ready to paste), with sensible web fallbacks if no handle is saved (e.g. `https://www.instagram.com/`, `https://www.tiktok.com/upload`)
  - Where the platform supports a web "compose / new post" URL (X intent, Facebook sharer), use that with the Travidz link prefilled
- Secondary actions: "Open Smart Deals" (existing sheet) and "Done → My videos"

This success card lives in `create.tsx` only (presentation layer). Smart Deals stays available, just no longer auto-opens — the share step is the new primary CTA.

### 2. Tidier profile socials editor

In `src/routes/profile.tsx` the "Link my socials" sheet today only accepts handles. We'll:

- Accept either a handle or a full URL per platform — normalise to a canonical `https://…` URL on save, derive the display handle for chips
- Add a small "Open" link next to each saved row so the creator can verify it works
- Keep the existing fields (YouTube, TikTok, Instagram, Facebook, X, Website)

No schema change required — `profile_socials.*_handle` columns continue to store the handle; we'll add lightweight URL parsing in `src/lib/social.functions.ts`'s `socialsInput` (strip `https://www.instagram.com/` etc. back to a handle before save). Display-side, we compose the URL from the handle when rendering the share buttons.

### 3. Share button on existing video cards keeps working

`src/components/feed/VideoCard.tsx` already shares `/?v=<id>` — no change needed. The new post-publish screen reuses the same URL shape so analytics, deals and the area feed all behave identically.

## Out of scope

- No database migration. `profile_socials` already has every column we need.
- No new auth/permissions, no changes to feed ranking or booking flow.
- No native deep-linking into the Instagram/TikTok apps via custom URL schemes (unreliable on web). We open the web URL — on mobile, the OS routes that to the installed app automatically.
- No changes to `cross_links` on individual videos (that feature stays as-is).

## Files touched

- `src/routes/create.tsx` — add post-publish success view with copy / QR / platform buttons; gate the existing redirect behind a "Done" button.
- `src/routes/profile.tsx` — accept URL-or-handle in the socials sheet, add "Open" link per row.
- `src/lib/social.functions.ts` — extend `handleSchema` to extract a handle from a pasted profile URL.
- `src/components/create/ShareToSocialsCard.tsx` *(new)* — the success card UI, reused nowhere else for now but isolated for clarity.
- `package.json` — add `qrcode.react` (~12 KB) for the QR.

## Tech notes

- Platform URL helpers live in one small util (e.g. `src/lib/social-share.ts`) so the post-publish card and the public profile chips share the same logic.
- Web compose URLs we'll use: X → `https://x.com/intent/post?text=…&url=…`, Facebook → `https://www.facebook.com/sharer/sharer.php?u=…`. Instagram, TikTok and YouTube don't have prefill URLs, so those buttons copy the link and open the creator's profile (or the platform's upload page) in a new tab with a toast: "Link copied — paste it into your post."
