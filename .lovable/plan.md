## Goal

A business clicking the invite link in their email should never see a "wrong account" dead-end. They should land in their own business dashboard — either by creating their account from the invite (first time) or by logging into their existing business account (returning) and seeing the new collab already accepted.

## Changes

### 1. `src/routes/business.invite.$token.tsx` — remove the friction screen
- Fetch the invite as today, then check the session.
- If signed in as a **different** email than the invite's `contact_email`:
  - Call `supabase.auth.signOut()` silently.
  - Redirect to `/login?invite=<token>&email=<inviteEmail>`.
- If **not signed in**: same redirect to `/login?invite=<token>&email=<inviteEmail>`.
- If signed in as the **correct** email: keep today's "Accept & claim your listing" button. After accept, refresh roles and route to `/business`.
- Delete the red "Wrong account / Sign out" panel.

### 2. `src/routes/login.tsx` — prefill + auto-accept
- Extend `searchSchema` with an optional `email` param.
- When `?invite=<token>` is present:
  - Prefill the `email` field from `?email=` and render it `readOnly` so the business can't accidentally type a different address.
  - After a successful sign-in OR sign-up that yields a session, call `acceptInvite({ data: { token } })` before navigating.
  - On success, refresh user roles and navigate to `/business` (not back to `/business/invite/:token`).
  - On failure, surface the error inline and stay on `/login`.
- The "Create account" tab stays available; the same auto-accept runs after signup.

### 3. Keep the server-side guard in `acceptInvite`
- The existing email-match check stays as defense in depth. It effectively never fires for a real user now because the client guarantees the session email matches the invite email before calling it.

## Resulting flow

- **New business:** email link → invite page sees no session → `/login?invite=...&email=...` → picks "Create account", sets password (email locked) → on signup, `acceptInvite` runs automatically → lands on `/business` with the listing already claimed.
- **Returning business:** email link → invite page sees no/wrong session (auto signed out) → `/login?invite=...&email=...` → enters password → `acceptInvite` runs automatically → lands on `/business` with the new collab already accepted.
- **Creator clicks an invite while signed in as a creator:** auto signed out and routed to the correct login — no dead-end.

## Files to change

- `src/routes/business.invite.$token.tsx`
- `src/routes/login.tsx`

## Out of scope

- Invite email template, business signup page layout, dashboard UI, creator-side outreach flow, the unrelated security findings shown in the More panel.
