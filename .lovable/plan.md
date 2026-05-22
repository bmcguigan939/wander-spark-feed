## Scope

1. **Instagram + Facebook** — Option A: handle becomes outbound link on the public profile; add `facebook_handle`; helper copy.
2. **YouTube auto-sync (per creator, opt-in)** — pull a creator's latest public uploads via the existing `YOUTUBE_API_KEY`.
3. **TikTok auto-sync (Travidz official only, opt-in)** — via the Lovable TikTok connector gateway.
4. **"Import from socials" (no-link path)** — every creator can paste single or bulk video URLs (YouTube / TikTok / Instagram / Facebook / X) without linking an account. Built on the existing `importExternalVideo`.
5. **Auto-verify on activity** (carried over).

Every path writes to the same `videos` table, dedupes on `creator_id + source_platform + source_video_id`, and uses `embed_mode: 'link_card'`.

---

## 1. Instagram + Facebook handle-as-link

**Migration**
- `profile_socials`: add `facebook_handle text` (nullable).

**`src/lib/social.functions.ts`**
- Extend `Platform`, `ProfileSocials`, and `socialsInput` with `facebook_handle`.
- Extend `detectPlatform` to recognise `facebook.com/(reel|watch|videos)/...` and `fb.watch/...`, returning `{ platform: 'facebook', sourceId }`. `previewByOgTags` already handles it.

**`src/routes/profile.tsx` — Socials sheet redesign**
- Three clear sub-sections:
  - **Your handles** — inputs for IG, FB, TikTok, YouTube, X, website. Saved via existing `upsertMySocials`. Helper: *"Shown as links on your profile so visitors can find you elsewhere."*
  - **Auto-sync** — toggles per platform that actually support it (YouTube always, TikTok admin-only). For Instagram/Facebook, show a disabled toggle with tooltip *"Not available — use Import instead"*.
  - **Import videos** — a textarea labelled *"Paste one or more video URLs (YouTube, TikTok, Instagram, Facebook, X) — one per line"* and an Import button. No account linking needed.

**`src/routes/u.$username.tsx`**
- Render a row of outbound social icons for each saved handle (IG, FB, TikTok, YouTube, X, website). `target="_blank" rel="noopener noreferrer nofollow"`.

**`src/routes/create.tsx`**
- Update placeholder examples to include Instagram and TikTok URLs.

---

## 4. "Import from socials" — no-link bulk import

**Why this is its own section:** the user wants a path for creators who don't want to link or auto-sync.

**New server fn** in `src/lib/social.functions.ts`:
- `importExternalVideosBulk({ urls: string[] })`
  - Validate: 1–25 URLs, each ≤500 chars.
  - For each URL: run `detectPlatform` → `previewYouTube` / `previewTikTok` / `previewByOgTags`, then the same insert logic as `importExternalVideo` (dedupe, owner = current user, `status='ready'`, `embed_mode='link_card'`, AI auto-tag re-run if available).
  - Return `{ imported: n, skipped: [{ url, reason }], failed: [{ url, error }] }`.

**UI hooks**
- Profile Socials sheet → "Import videos" section (textarea + Import button, shows per-URL outcome).
- `/create` already supports single-URL import; keep as-is.
- Optional: a small "Bulk import" entry point on `/studio` for creators with no videos yet.

**No new schema, no new secrets.**

---

## 2. YouTube auto-sync (per creator, public API)

**New server fn:** `syncYouTubeForCreator({ userId? })` in `src/lib/social.functions.ts`.

Flow:
1. Read `profile_socials`; require `youtube_handle` or `youtube_channel_id`.
2. Resolve handle → channel id via `channels?part=id&forHandle=@<handle>`; cache result back to `profile_socials.youtube_channel_id`.
3. `channels?part=contentDetails&id=<id>` → uploads playlist id.
4. `playlistItems?part=snippet,contentDetails&playlistId=<uploads>&maxResults=12`.
5. Upsert each video into `videos` (same dedupe/shape as `importExternalVideo`).

**Triggers**
- "Sync YouTube now" button in the Socials sheet → calls the server fn for the current user.
- Auto-kick on `upsertMySocials` save when YouTube handle changes (fire-and-forget; log errors).
- New cron `src/routes/api/public/cron/sync-youtube.ts` — every 6h iterate creators with a YouTube handle, refresh latest 12. Wire `signature` header check using the existing cron secret pattern.

**Failure handling:** never throw to the UI — return `{ synced, error }`.

---

## 3. TikTok auto-sync (Travidz official account only)

Confirms the connector-account constraint: the Lovable TikTok connector authenticates **one** TikTok account (Travidz's). Per-creator TikTok sync would need a full TikTok Login Kit OAuth flow — explicitly out of scope.

**New server fn:** `syncTikTokOfficial()` in `src/lib/social.functions.ts`.

Flow:
1. Read `LOVABLE_API_KEY` and `TIKTOK_API_KEY` from `process.env`.
2. `POST https://connector-gateway.lovable.dev/tiktok/video/list/` with cursor + max_count and fields `id,title,cover_image_url,share_url,video_description,create_time,duration`.
3. Upsert each video under a designated official creator account (env `TRAVIDZ_OFFICIAL_CREATOR_ID`, or admin-settable in `/admin/seed`).

**Triggers**
- "Sync TikTok now" admin-only button in `/admin/seed` (or `/admin/videos`).
- New cron `src/routes/api/public/cron/sync-tiktok.ts` every 6h.

---

## 5. Auto-verify on activity

Unchanged from prior plan:
- `autoTrustOnActivity({ userId, kind })` in `src/lib/verification.functions.ts` (idempotent, admin client).
- Called when a video flips to `status='ready'` (Mux webhook + every import/sync path above) → trust creator.
- Called when a redemption confirms → trust business.
- Remove "Get verified" step from `src/components/business/OnboardingChecklist.tsx`.
- Relabel admin UI in `src/routes/admin.users.tsx` — button becomes "Trusted/Untrust"; add "Show untrusted only" filter (default off); muted styling for untrusted brand-new accounts.
- Backfill migration: flip `is_verified = true` for users with prior activity.

---

## Files touched (summary)

- **Migrations:** add `facebook_handle`; backfill `is_verified`.
- **`src/lib/social.functions.ts`** — Facebook in schema; `detectPlatform` Facebook; new `importExternalVideosBulk`, `syncYouTubeForCreator`, `syncTikTokOfficial`.
- **`src/lib/verification.functions.ts`** — `autoTrustOnActivity`.
- **`src/lib/mux.functions.ts`** — trigger autoTrust on video ready.
- **`src/routes/api/public/payments/webhook.ts`** (or equivalent confirm path) — trigger autoTrust on confirm.
- **`src/routes/api/public/cron/sync-youtube.ts`** (new), **`src/routes/api/public/cron/sync-tiktok.ts`** (new).
- **`src/routes/profile.tsx`** — Socials sheet rebuilt into Handles / Auto-sync / Import sections; "Sync YouTube" button; bulk Import UI.
- **`src/routes/u.$username.tsx`** — outbound social icons row.
- **`src/routes/create.tsx`** — placeholder copy.
- **`src/routes/admin.seed.tsx`** — "Sync TikTok now" + (optional) set/clear official creator id.
- **`src/routes/admin.users.tsx`** — relabel, filter, muted styling.
- **`src/components/business/OnboardingChecklist.tsx`** — remove "verified" step.

---

## Out of scope

- Per-user TikTok OAuth (TikTok Login Kit).
- Instagram / Facebook auto-sync (Meta Graph API + Business account + app review).
- Badge redesign, legal/agreement copy, billing.

## Verification after build

- `/u/mrslindamcguigan` shows clickable Instagram (and Facebook if added) outbound links.
- A creator with YouTube handle clicks "Sync YouTube" and their latest videos appear in `/studio`.
- A creator pastes 5 mixed URLs in the Socials sheet → all import as link cards, dedupe works on repeat.
- Admin clicks "Sync TikTok now" → official Travidz TikTok videos appear in the feed.
- New signups never see "Verify" prompts; publishing/redeeming auto-trusts; backfill flips existing active users.
