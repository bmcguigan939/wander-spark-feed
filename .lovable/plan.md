## Why the buttons don't work

The "Invite a business" review step in `src/components/studio/TagBusinessSheet.tsx` still uses the legacy `openMail` (`mailto:` link) for its primary CTA. In the in-app preview / many desktop browsers this does nothing visible, and even when it does work it bypasses the Travidz email queue + thread audit trail we already wired into `SmartDealsSheet`.

## Fix — bring this sheet in line with SmartDealsSheet

In `src/components/studio/TagBusinessSheet.tsx`, replace the bottom action block (lines ~308–325):

1. **Swap "Open in mail app" → "Send from Travidz"**
   - Add `sendInviteEmail` via `useServerFn` and a `sendM = useMutation` wrapping it.
   - Button calls `sendM.mutate({ inviteId, subject, body })`.
   - Disabled when `!subject || !body || !contactEmail || sendM.isPending`.
   - Label: "Send from Travidz" with the `Mail` icon; spinner copy: "Sending…".
   - On success: toast "Invite sent to {contactEmail}", `clearDraft()`, `onOpenChange(false)`, and invalidate `["business-invites", videoId]` so the row shows the new `last_sent_at`.
   - On error: toast the error message.

2. **Remove `openMail` and the `mailto` helper** in this file (and its unused imports if any) — single source of truth for sending is the queue.

3. **Keep "Done" and the supporting pills** (Regenerate, Copy email, Copy invite link) exactly as they are; they're useful manual fallbacks.

4. **Update the footer hint** from "Switch apps to copy info — … The email opens in your own inbox …" to:
   > "We'll send this from noreply@travidz.com. Replies come back to your Travidz Messages so the deal stays documented."

## Out of scope
- No backend changes — `sendInviteEmail` and the queue already handle delivery, suppression, and unsubscribe-token attachment (fixed earlier today).
- No design overhaul — same button styling, same sheet layout.
