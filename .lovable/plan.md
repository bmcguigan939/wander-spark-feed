## What's happening

The invite email shows the invite link twice:

1. As a raw URL inside the body text (e.g. `https://travidz.com/business/invite/39318305f540c54be66fa3f6ca86b7ce`) — this comes from the AI/fallback draft, which is instructed to include the URL verbatim in the body.
2. As the pink **Claim your listing** button rendered by `BusinessInviteEmail` (`src/lib/email-templates/business-invite.tsx`), which links to the same `inviteUrl`.

They go to the same place, so the long code is redundant and looks broken on mobile.

## Plan

**1. `src/lib/email-templates/business-invite.tsx`**
- Rename the CTA button label from "Claim your listing" to "Approve your listing".
- Move the button up so it sits directly under the email body (it already does — but I'll make sure the "Before you accept…" terms paragraph stays *below* the button so the CTA is the first thing after the message).
- Also update the `Preview` text from "claim your listing" → "approve your listing" for consistency in the inbox preview line.

**2. `src/lib/outreach.functions.ts`**
- Stop telling the AI to paste the invite URL into the body. Update the system prompt: instead of "(6) a clear single-line CTA containing the invite URL", say "(6) end with a short closing — do NOT include the invite URL, a 'click here' link, or any raw URL in the body; the email template renders the CTA button separately."
- Remove the `Invite URL (include verbatim in the email body): …` line from the user-data block passed to the model (so it can't paste it even if it wants to).
- Update `fallbackInviteDraft` to drop the `\nYou can claim your free listing in one click:\n${args.inviteUrl}\n` line — the template's button is the CTA.
- `inviteUrl` is still needed to build the email (for the button), so it stays in the `sendInviteEmail` / template wiring — only removed from the AI body content.

## Out of scope

- No change to the `BusinessInviteEmail` brand/layout beyond the button label + preview text.
- No DB changes, no admin UI, no change to `draftApplicationReply`.
- Existing already-drafted invites stored in DB will still contain the old URL line until re-drafted — not rewriting historical drafts.

## Result

The email will show the message, then the pink **Approve your listing** button, then the terms paragraph — with no duplicated long URL inside the body.