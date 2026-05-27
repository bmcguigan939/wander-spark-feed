## Problem

The "Something went wrong / Minified React error #310" screen on `business/invite/$token` is a **React hooks-order violation**, not a real runtime failure. In `src/routes/business.invite.$token.tsx` the auto-route `useEffect` (added in the previous change) was placed **after** the two early returns:

```
if (isLoading) return <Loader/>;
if (error || !data) return <NotFound/>;
…
useEffect(() => { /* signOut + navigate to /login */ }, [...]);
```

On first render `isLoading` is true → component returns before reaching the `useEffect`. On the next render, data resolves → component now calls one more hook than before → React throws #310 → root `errorComponent` renders the "Something went wrong / Try again" page. "Try again" calls `router.invalidate()` and re-runs, which is why hitting it eventually lands on `/login`.

So the auto-routing logic is actually correct — it just never gets a chance to run cleanly because the component crashes first.

## Fix

Move the auto-route `useEffect` **above** every early return in `src/routes/business.invite.$token.tsx`, so it always runs on every render regardless of `isLoading` / `error` state. Inside the effect, keep the existing guards (`if (!accountQ.data || !inviteEmail) return;` etc.) so it only acts once the account-state query resolves.

Concretely, reorder the top of `InvitePage` to:

1. All `useState` / `useQuery` / `useMutation` / `useServerFn` hooks (unchanged).
2. Derive `inviteEmail`, `currentEmail`, `wrongAccount` from `accountQ.data` and `user` (move these up from below the early returns).
3. The `useEffect` that, when the session doesn't match the invited email, calls `signOut()` (if needed) and `navigate({ to: "/login", search: { invite, email } })`.
4. THEN the `if (isLoading)` and `if (error || !data)` early returns.
5. The rest of the render (status branches, accept button, etc.) unchanged.

No other files need to change. The login page already accepts `?invite=…&email=…`, prefills the email, runs `acceptInvite` after sign-in/sign-up, and routes to `/business` — that flow is correct and was already implemented.

## Result

- New business clicks "Accept & claim your listing" in email → invite page mounts → effect immediately redirects to `/login?invite=…&email=…` (no error screen, no manual retry). They flip to "Create account", sign up, `acceptInvite` runs automatically, land on `/business`.
- Existing business → same path, they sign in instead of signing up, `acceptInvite` runs, land on `/business`.
- Creator who accidentally clicks an invite → effect calls `signOut()` then redirects to the correct login.

## Out of scope

- Email template, signup page UI, dashboard layout, creator-side outreach.
- The root `errorComponent` itself — it's working as designed; the bug was upstream.
