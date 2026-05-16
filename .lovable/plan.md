# Two profile bugs

## Bug 1 — "Become a creator" does nothing

Root cause: `public.user_roles` has SELECT policies but **no INSERT policy**. The `becomeCreator` server function runs as the authenticated user (RLS applies), so its insert is rejected. The mutation in `src/routes/profile.tsx` has no `onError`, so the failure is silent and the user sees no change.

Fix:
- **Migration** — add an INSERT policy on `public.user_roles` that lets a logged-in user insert a row only for themselves and only with `role = 'creator'`. Admin/business roles stay non-self-assignable.
  ```sql
  create policy "users can self-assign creator role"
    on public.user_roles for insert to authenticated
    with check (auth.uid() = user_id and role = 'creator');
  ```
- **`src/routes/profile.tsx`** — add `onError` to `becomeM` showing a `toast` with the error message, and a success toast ("You're a creator now") so the state change is visible while `refreshRoles()` settles.

## Bug 2 — "Arrow facing right" in the top-right kicks you out

That icon is the `LogOut` button (rectangle + arrow exiting right) sitting next to the gear. It's being mistaken for a "next / go" affordance, so a single tap signs you out and the auth-guard redirects to `/login` — exactly the "kicks me out" symptom.

Fix in `src/routes/profile.tsx` (presentation only):
- Remove the top-right `LogOut` icon button.
- Move sign-out into the **Edit profile** sheet as a clearly labelled destructive row at the bottom (`Sign out`, muted-foreground border, `LogOut` icon + text), with a `confirm("Sign out of Travidz?")` guard before calling `signOut()`.
- Keep the gear button in the header (now alone) — it opens the same sheet.

## Out of scope

- No changes to `becomeCreator` server fn, auth flow, or any other route.
- The other top-right area items elsewhere in the app (feed, business) are untouched.
