# Fix: 401 "Unauthorized request" when uploading a video

## What's actually happening

The 401 you're seeing is **from Mux, not from Travidz**. The response body shape `{"error":{"type":"unauthorized","messages":["Unauthorized request"]}}` is Mux's API error format.

Flow today:
1. You tap "Choose a video" → browser calls our `createDirectUpload` server function.
2. That server function calls `mux.video.uploads.create(...)` using `MUX_TOKEN_ID` + `MUX_TOKEN_SECRET`.
3. Mux replies **401 Unauthorized**, the server fn throws, and we surface the raw Mux body to the toast — which is what's pinned at the bottom of your screenshot.

So no upload URL is ever issued; the file never leaves the device. The Supabase auth wiring is fine — both `attachSupabaseAuth` (client) and `requireSupabaseAuth` (server) are registered correctly, and the secrets `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` do exist in Lovable Cloud. They're just being rejected by Mux.

## Likely causes (in order)

1. **Token revoked or rotated in Mux** but the new values were never copied into Lovable Cloud.
2. **Wrong environment** — the token belongs to one Mux Environment (e.g. "Development") and the project is being treated as another. Each Mux Environment has its own token pair.
3. **Token typo / trailing whitespace** when the secret was originally pasted.
4. **Mux account is suspended** (billing / verification) — the dashboard will show a banner.

## Plan

### 1. Rotate Mux credentials (you, in Mux dashboard)
- Open Mux → Settings → Access Tokens.
- Confirm which **Environment** is selected at the top (this is the #1 gotcha).
- Either confirm the existing token is still active, or create a new **Access Token** with permissions: `Mux Video — Read & Write`.
- Copy the new **Token ID** and **Token Secret**.

### 2. Update the secrets in Lovable Cloud (me, after you confirm)
- Update `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` with the new values.
- No code change needed for this step.

### 3. Improve the error surface so this is debuggable next time (me, code change)
File: `src/routes/create.tsx` and `src/lib/mux.functions.ts`
- In `createDirectUpload`'s `.handler()`, wrap the Mux SDK call in try/catch. On failure, log the full Mux response server-side and throw a clean, human-readable error like *"Video service rejected the upload — please contact support (MUX_AUTH)."* instead of leaking Mux's raw JSON to the toast.
- In `UploadFlowBody.startUpload`, render the error in a proper inline alert (red banner inside the upload card) instead of just a toast that gets clipped at the bottom of the screen.

### 4. Verify end-to-end
- After secrets are updated, retry the upload from the same device.
- Check server function logs to confirm `mux.video.uploads.create` succeeds and returns an `uploadUrl`.
- Watch the upload progress bar reach 100%, then confirm the new video appears under `/studio/videos`.

## Out of scope
- No changes to the database, RLS, or the cross-links / feed work from earlier turns.
- Not switching providers away from Mux.
- Not changing how creators authenticate.

## What I need from you before I can implement
1. Confirm you want me to rotate to a fresh Mux access token (recommended), **or** confirm you've already verified the existing token in the Mux dashboard and just want me to re-paste it.
2. Once you've copied the new Token ID + Token Secret from Mux, paste them in chat (or use the secrets prompt I'll send) and I'll update them and ship the error-handling improvements in the same turn.
