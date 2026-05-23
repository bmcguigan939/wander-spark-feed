# Business invite: review T&Cs, then signup-or-login

Right now the business invite email sends them to `/business/invite/$token` where the only signed-out option is a generic "Sign in to accept" button. There's no link to the full Business Agreement, no signup path with their email pre-filled, and no detection that they may already have a Travidz account.

This plan adds those three pieces.

## 1. Invite email — link to full T&Cs

Update `src/lib/email-templates/business-invite.tsx`:
- Add a secondary link/button under the primary "Claim your listing" CTA: **"Read the full Business Agreement"** → `https://travidz.com/legal/business-agreement`.
- Add one short line of body copy: *"You can review the full terms before accepting. By clicking Accept on the invite page, you agree to the Travidz Business Agreement."*
- Pass a new `termsUrl` prop (default `https://travidz.com/legal/business-agreement`) from the send call site in `business-invites.functions.ts` so it's easy to swap envs later.

(Hedgehog Corner is just the test recipient — no template branching needed; the same email serves all real businesses.)

## 2. Invite page — detect account state before accept

Update `src/routes/business.invite.$token.tsx` and add a server fn `checkInviteAccountState` in `src/lib/business-invites.functions.ts`:

- New server fn (public, no auth): given an invite token, returns `{ email, accountExists: boolean }`. It looks up the invite, reads its `recipient_email`, and checks `auth.users` via `supabaseAdmin.auth.admin.listUsers` (filtered by email) — returns only the boolean, never user data.
- The invite page calls this on load and renders three states when signed out:
  1. **No account yet** → primary CTA "Create your business account" → `/business/signup?invite=<token>`.
  2. **Account exists** → primary CTA "Log in to accept" → `/login?invite=<token>&next=/business/invite/<token>`, with helper text *"You already have a Travidz account for this email — log in to see your new creator listing and contract."*
  3. **Already signed in** → existing "Accept & claim your listing" button (unchanged).
- Above the CTAs, add an inline T&C acknowledgement: a checkbox **"I have read and agree to the [Business Agreement](/legal/business-agreement)"** that must be ticked before Accept/Create/Login buttons enable. The link opens the agreement in a new tab.
- Persist this acceptance: when `acceptInvite` runs, also insert a row into a small `business_agreement_acceptances` table (`user_id`, `invite_id`, `agreement_version`, `accepted_at`, `ip`) so we have an audit trail.

## 3. Business signup — email pre-filled from invite

New route `src/routes/business.signup.tsx`:
- Reads `?invite=<token>` from search params.
- Calls the same `checkInviteAccountState` fn to fetch the locked `email` from the invite.
- Renders a minimal form: **email (read-only, pre-filled), password, confirm password**, plus the same T&C checkbox.
- On submit: `supabase.auth.signUp({ email, password, options: { emailRedirectTo: <invite url> } })`, then on success calls `acceptInvite({ token })` and navigates to `/business`.
- If signup returns "user already registered", flips the UI to *"You already have an account — log in instead"* with a link to `/login?invite=<token>`.

Update `/login` (`src/routes/login.tsx`) to honor `?invite=<token>&next=...` — after a successful sign-in, redirect to `next` (defaulting to `/business/invite/<token>`) so they land back on the invite page where the Accept button is now active.

## 4. Database

One small migration:
- `business_agreement_acceptances` table with `id`, `user_id`, `invite_id` (nullable, FK to `business_invites`), `agreement_version` (text, default `'v1'`), `accepted_at`, `ip`, `user_agent`.
- RLS: users can `SELECT` their own rows; only service role can `INSERT` (writes happen from `acceptInvite` server fn via `supabaseAdmin`).

## Out of scope

- Versioned T&C diffs / re-acceptance prompts on agreement updates (we just stamp `v1` for now).
- Google sign-up on the business signup page (email/password only for v1 — keeps the email-locked-to-invite guarantee simple).
- Changing the creator-side outreach flow or the email infrastructure itself.
