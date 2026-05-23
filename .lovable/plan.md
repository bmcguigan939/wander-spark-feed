# Let the business set the website at accept time

## Problem
`acceptInvite` requires `invite.website_url`, but creators often send invites without one. The business has no way to provide it, so accept fails with a misleading "update your profile" toast.

## Change

### 1. Invite page (`src/routes/business.invite.$token.tsx`)
- Add a **Website URL** input inside "The offer" card.
- Prefill with `invite.website_url` if present; otherwise empty with placeholder `https://yourbusiness.com`.
- Always editable — the business may want to override the URL the creator entered (different domain, booking page, etc.).
- Light client validation: must start with `http(s)://` and parse as a URL.
- Disable **Accept & claim your listing** until both the agreement is checked AND a valid URL is present.
- Pass the URL through to `acceptInvite({ data: { token, websiteUrl } })`.

### 2. Server function (`src/lib/business-invites.functions.ts`)
- Extend `acceptInvite` input validator with optional `websiteUrl: z.string().url().max(2048)`.
- Resolution order: `data.websiteUrl ?? invite.website_url`.
- If still missing, return a clearer error: *"Please enter your website URL to continue."* (rather than blaming the profile).
- If `data.websiteUrl` is provided and differs from `invite.website_url`, update the `business_invites` row so the audit trail / emails reflect the final URL.
- Use the resolved URL when inserting the `deals` row (line 318).

### 3. Business signup flow (`src/routes/business.signup.tsx`)
- No change needed — after signup it redirects back to `/business/invite/:token`, where the new URL field will be shown.

## Out of scope
- No schema change (`business_invites.website_url` stays nullable).
- No change to creator invite-creation form (still optional there).
- No change to commission, payouts, or deal-application logic.
