## Why the button stays disabled

In `src/components/studio/TagBusinessSheet.tsx` the submit button is gated by:

```ts
const canSubmit =
  businessName.length > 0 && websiteUrl.length > 0 && contactEmail.length > 0
```

So a missing website blocks submission, even though the business is supposed to be able to add their own site when they accept the invite. The other invite path (`SmartDealsSheet`) already treats website as optional and our `createBusinessInvite` server fn already accepts `websiteUrl: null`.

## Fix

In `src/components/studio/TagBusinessSheet.tsx`:

1. Drop `websiteUrl.length > 0` from `canSubmit` (line 138) — keep `businessName` + `contactEmail` required.
2. Update the website field label/placeholder to say "Direct website (optional)" so the requirement matches what's enforced.
3. When submitting, pass `websiteUrl: websiteUrl.trim() || null` (line 116) so we don't send an empty string downstream.

No backend changes — the server already accepts null.
