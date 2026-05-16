# Fix sign-in flow and "kicks me out" of protected pages

## Root causes

**1. "Can't sign back in after signup"** — Email confirmation is required on the project. Auth logs confirm `400: Invalid login credentials` after a signup attempt. The flow is: user signs up → Supabase creates a pending user (no session) → user tries to sign in → rejected as unconfirmed → looks like the password is wrong. They then "create the account again" which actually re-sends a confirmation email but still gives no session.

**2. "Following / Saved / Profile kick me out"** — Same underlying issue. Because signup returns no session, `useAuth().user` is `null` on every protected page, so `/profile` and `/collections` immediately `navigate({ to: "/login" })` and the Feed's Following tab does `window.location.href = "/login"`.

**3. "There is no setup new account option"** — The signup toggle exists at the bottom of `/login` but renders as small muted text most users miss.

## Fix

### A. Backend — enable auto-confirm email signups
Call `supabase--configure_auth` with `auto_confirm_email: true` (other flags unchanged). This is appropriate for an app in active development/testing with no email infra yet. The new-user trigger (`handle_new_user`) already creates a profile + assigns the `traveller` role, so confirmed accounts work end-to-end immediately.

### B. Frontend — `src/routes/login.tsx` only (UI fix)
- Replace the tiny muted toggle at the bottom with a **segmented control at the top of the form**: two equal pills `Sign in` | `Create account`, active = primary bg.
- Update submit button label to match the active mode.
- Add a small post-signup success path: when `signUp` returns a session, navigate to `/`; when it returns no session (confirmation still required for any future tightening), show "Check your email to confirm, then sign in" and flip to the Sign in tab. (Defensive — once auto-confirm is on, this branch won't normally fire.)
- Trim the duplicated `error` shadowing in `submit()`.

### C. No business-logic or RLS changes
Leaving `useEffect` redirects on `/profile` and `/collections` as-is — they behave correctly once auto-confirm gives the user a session immediately on signup.

## Files touched
- Auth setting (via tool) — `auto_confirm_email: true`
- `src/routes/login.tsx` — UI + post-signup branching

## Out of scope (next milestone)
Real transactional email (Lovable Emails) + email-verification flow lives in Step 2 of the broader plan already approved.

Approve and I'll ship.
