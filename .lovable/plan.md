
# Finish UI — Socials + Verification

Backend (migration, server functions, cron, webhooks, auto-trust) is already live. This plan covers only the remaining frontend/UI work to expose it.

## 1. Profile Socials sheet — `src/routes/profile.tsx`

Restructure the existing Socials sheet into three clearly labelled sections:

**a) Your handles**
- Inputs for: Instagram, Facebook (new), TikTok, YouTube, X, Website.
- Each input shows live helper text ("instagram.com/<handle>") and validates format.
- Save button calls `upsertMySocials` (already supports `facebook_handle`).

**b) Auto-sync**
- YouTube: "Sync now" button → calls `syncYouTubeForCreator`. Shows last-sync timestamp + count.
- TikTok: visible only to admins → "Sync official TikTok" button calling `syncTikTokOfficialAdmin`.
- Instagram / Facebook: disabled row with tooltip explaining Meta Graph API requirement.

**c) Import videos (no link required)**
- Textarea accepting up to 25 URLs (one per line).
- "Import" button calls `importExternalVideosBulk`.
- Result list shows per-URL outcome (imported / duplicate / failed + reason).

## 2. Public profile — `src/routes/u.$username.tsx`

Render a row of outbound social icon links under the bio when handles exist:
- Instagram → `instagram.com/<handle>`
- Facebook → `facebook.com/<handle>`
- TikTok → `tiktok.com/@<handle>`
- YouTube → `youtube.com/channel/<youtube_channel_id>` (fallback to `/@<handle>`)
- X → `x.com/<handle>`
- Website → as-is

Use `lucide-react` icons, `target="_blank" rel="noopener noreferrer"`, semantic tokens only.

## 3. Create flow — `src/routes/create.tsx`

Update the source URL placeholder/help text to mention Instagram and TikTok (already handled by `detectPlatform`).

## 4. Admin — `src/routes/admin.users.tsx`

- Relabel "Verify / Unverify" buttons to "Mark Trusted / Untrust".
- Add a filter: All / Trusted / Untrusted.
- Add a small "auto-trusted" badge for users flipped by `autoTrustOnActivity`.

## 5. Admin seed — `src/routes/admin.seed.tsx`

Add a "Sync official TikTok now" button wired to `syncTikTokOfficialAdmin`, with toast feedback.

## Out of scope
- Per-user TikTok/IG/FB OAuth.
- Setting the `TRAVIDZ_OFFICIAL_CREATOR_ID` secret (user action).
- Visual redesign of badges or onboarding beyond the relabels above.

## Verification after build
- `/profile` shows the three sections; saving Facebook handle persists.
- Bulk import accepts a mix of YouTube/TikTok/IG URLs and reports per-URL status.
- `/u/mrslindamcguigan` shows Instagram (and Facebook if set) as clickable icons.
- Admin can trigger TikTok sync and see "Trusted" filter working.
- New signups never see a "Verify" step; auto-trust still flips them on first publish/redeem.
