# Diagnose & fix the blank-thumbnail Studio videos

## What's actually happening

Looked at the 3 stuck videos in the database. All three "Processing" rows:
- `status = 'uploading'` (the initial state, never advanced)
- `mux_upload_id` is set (Mux gave us an upload URL)
- `mux_asset_id` is NULL, `mux_playback_id` is NULL, `thumbnail_url` is NULL

The only "Live" video with a working thumbnail is the seeded demo (`Sunset surf session in Canggu`). The TikTok-imported ones use TikTok's CDN thumbnail. Everything you uploaded from your phone never finished the Mux pipeline.

Two possible causes — both tie back to the MUX token you just rotated:

1. **Mux webhook secret no longer matches.** When you rotated credentials, if `MUX_WEBHOOK_SECRET` wasn't updated, our `mux-webhook` route rejects every event with 401 and the row never flips to `ready`.
2. **The upload PUT from the phone failed.** The upload URL was created but the browser didn't successfully upload the bytes — Mux therefore never produced an asset and no webhook fires.

## Plan

### Step 1 — Verify what Mux thinks

Add a small admin/creator server fn `reconcileMyStuckUploads` that, for the signed-in creator's videos where `status='uploading'` and `mux_upload_id IS NOT NULL`:
- Calls `mux.video.uploads.retrieve(uploadId)` to see its status (`waiting`, `asset_created`, `errored`, `cancelled`, `timed_out`).
- If `asset_created` → fetch the asset, write `mux_asset_id`, `mux_playback_id`, `thumbnail_url`, `status='ready'`.
- If `errored` / `cancelled` / `timed_out` → set `status='failed'` so the row stops showing as "Processing" forever.
- Returns a per-video summary.

Surface this as a **"Refresh status"** button on the Studio Videos page next to the Processing tab. One tap repairs any video that Mux has already finished — no waiting on the webhook.

### Step 2 — Make webhook auth issues visible

Right now `mux-webhook` silently 401s on a bad signature. Add a one-line log of the failure (no secret leak) so we can see in server logs whether webhooks are actually arriving and being rejected vs. not arriving at all. This is the diagnostic that tells us if it's cause #1 or cause #2.

### Step 3 — Tell you what to check in Mux

The `MUX_WEBHOOK_SECRET` env var must match the signing secret shown next to your webhook endpoint in the Mux Dashboard → Settings → Webhooks. After rotating API tokens, the **webhook signing secret is separate** and may need to be re-copied. If it doesn't match, no upload will ever flip to ready.

Webhook URL should point at: `https://project--144ee3b9-80e0-4ec8-883d-e0d5686cb4a1.lovable.app/api/public/mux-webhook` (stable production URL).

If the secret is wrong, I'll prompt you to paste the correct one via the secrets tool.

## Out of scope

- No changes to the upload UI itself.
- No retry-upload flow — if Mux says the upload errored, you'll just re-upload from the phone.
- No schema changes (`status='failed'` is already an allowed value in the videos table).
