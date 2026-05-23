## Update Mux webhook secret and verify

You've shared a Mux signing-key **ID** (`77ebdac4-6fcc-4187-9a9d-16d980d68b92`) and **secret** (`TuGhApot8…hYxOo45nzVZ`). I'll rotate the stored webhook secret so Mux events start flipping uploads to `ready`.

### Steps

1. **Update `MUX_WEBHOOK_SECRET`** via the secure secret form (only the secret value is needed — the ID is informational and lives in the Mux dashboard).
2. **Confirm webhook URL in Mux dashboard** is set to:
   `https://project--144ee3b9-80e0-4ec8-883d-e0d5686cb4a1.lovable.app/api/public/mux-webhook`
3. **Trigger a test webhook** from Mux's dashboard (Settings → Webhooks → "Send test"), then check server logs to confirm the signature now verifies (no more `Invalid signature` warnings).
4. **Run "Refresh status"** on `/studio/videos` to reconcile the 3 stuck `uploading` videos via `mux.video.uploads.retrieve()` regardless of webhook state.

### Notes

- I will **not** paste the secret into code or commit it anywhere — it goes through the secret form so it's stored as an environment variable only.
- No code changes are needed; the webhook handler and reconcile button are already wired from the previous turn.
- If after step 3 the test webhook still fails verification, the secret in Mux's dashboard doesn't match what you sent — we'd re-copy from Mux and update again.

Approve and I'll trigger the secret update form.
