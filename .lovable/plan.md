## Why emails aren't sending

`notify.travidz.com` is verified and `process-email-queue` is running, but every send fails with:

```
400 missing_unsubscribe: Transactional emails must include an unsubscribe_token
```

Two things are missing from the current setup:

1. The enqueue helper (`src/lib/email-send.server.ts`) never mints/attaches an `unsubscribe_token`.
2. There is no `/email/unsubscribe` server route or page, so even if the token were attached, the link in the email would 404.

## What I'll change

### 1. Mint and attach an unsubscribe token on every transactional send
In `src/lib/email-send.server.ts → enqueueTransactionalEmail`:
- Before enqueueing, look up `email_unsubscribe_tokens` for the recipient (lowercased).
- If none exists, generate one (`crypto.randomUUID()`) and insert it.
- Add `unsubscribe_token: <token>` to the payload that goes to `enqueue_email`. The dispatcher already forwards `payload.unsubscribe_token` to `sendLovableEmail`, so no change needed there.

This single change unblocks every queued business-invite email.

### 2. Add the unsubscribe server route
Create `src/routes/lovable/email/unsubscribe.ts` (public, no auth):
- `GET /lovable/email/unsubscribe?token=…` → validates token, returns `{ valid, email, used }`.
- `POST /lovable/email/unsubscribe` body `{ token }` → marks token used and upserts `suppressed_emails` (reason: `unsubscribed`). Append-only, idempotent.

### 3. Add the user-facing unsubscribe page
Create `src/routes/email.unsubscribe.tsx`:
- Reads `?token=` from the URL.
- On mount calls the GET route; renders branded "Confirm unsubscribe" button, or "Already unsubscribed" / "Invalid link" states.
- On confirm POSTs and shows success.
- Styled with existing Travidz tokens (dark theme, primary color).

### 4. Add `/lovable/` and `/email/unsubscribe` allow-list in `src/start.ts`
Confirm the request middleware doesn't redirect those paths (skip auth gates). If it already does, no change.

### 5. Retry the stuck `pending` row
Once the token is wired, re-queueing the existing pending message will let it actually deliver on the next cron tick. The 3 `failed` rows stay as the historical audit trail (the thread system already mirrors them).

## Out of scope
- No template content changes (Lovable appends the unsubscribe footer automatically once the token is present).
- No DNS work — domain is already verified.
- No changes to the auth-email pipeline (already working: last `recovery` email sent successfully).

## How to verify after build
- Trigger "Send contract" again on a video.
- `email_send_log` should show `pending → sent` within ~5–10s (cron interval).
- Recipient inbox receives the branded invite from `noreply@travidz.com` with the auto-appended unsubscribe footer.
- Clicking the footer link lands on the new `/email/unsubscribe` page.
