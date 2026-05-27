## Fix two invite bugs

### 1. "Copy email" omits the invite link
In `src/routes/business/TagBusinessSheet.tsx` and `src/routes/business/SmartDealsSheet.tsx`, update the "Copy email" button handlers to append a CTA line with the actual invite URL when copying:

```
{subject}

{body}

Approve your listing: {inviteUrl}
```

Only append when `inviteUrl` is available. Leave the separate "Copy invite link" button unchanged.

### 2. Travidz-sent email lands on Linda's profile
The AI-drafted body still occasionally contains a `travidz.com/u/<creator>` profile link, even though it was removed from `socialLinks` and a prompt rule warns against it. The model re-invents it.

In `src/lib/outreach.functions.ts`, after the gateway returns a draft (and inside `fallbackInviteDraft` too), post-process `draft.body` to:
- Strip any line containing `travidz.com/u/` or `travidz.com/business/invite/`
- Collapse resulting double blank lines

This guarantees the only Travidz link a recipient sees in a Travidz-sent email is the "Approve your listing" CTA button rendered by the email template.

### Out of scope
- Already-sent/queued emails
- Unrelated open security findings
- Commission/template/invite-flow logic
