# Step 1 — Auth polish + role picker

Working through the roadmap in order. This is item 1; we'll smoke-test it, then move to item 2.

## What we're adding

1. **Role picker on first sign-in.** New users land on `/welcome` (instead of `/`) with three big cards: **Traveller** (default), **Creator**, **Business**. Choosing Creator self-assigns the `creator` role (existing RLS policy already allows this). Choosing Business sends them to `/business/apply`. Choosing Traveller proceeds straight to the feed. The picker only appears when the user has exactly the default `traveller` role and no others.
2. **Forgot/reset password.** Add a "Forgot password?" link on `/login`. Add a `/reset-password` public route that detects the recovery hash, prompts for a new password, and calls `supabase.auth.updateUser({ password })`.
3. **Branded auth emails (Lovable Emails).** Set up the project's email domain via the email setup dialog (if not already configured), then scaffold the six auth templates (signup confirmation, magic link, recovery, invite, email-change, reauthentication) styled to match Travidz (compass logo, primary color from `src/styles.css`, white body). Auth email hook is queue-based.
4. **Sign-out polish.** Confirm dialog before sign-out from the profile edit sheet (already implemented per earlier turn — verify it still works and routes to `/login`).

## What we're NOT changing

- No schema changes. `user_roles` and the `users can self-assign creator role` policy already exist; the trigger seeds `traveller`. Business role still goes through the existing `business.apply.tsx` flow.
- No Google OAuth changes (already wired via the Lovable broker).
- No transactional/app emails yet — that's a separate roadmap item.

## Technical details

- **`src/routes/welcome.tsx`** — new public route. `beforeLoad` redirects to `/login` if not signed in, and to `/` if the user already has a non-default role (creator/business/admin). Three cards using existing design tokens.
- **`src/routes/__root.tsx`** — after `onAuthStateChange` fires for a new sign-in, if the user's only role is `traveller` AND they have no profile activity (no videos, no follows — cheap check: just rely on a flag), route them to `/welcome` once. Simpler approach: gate purely on roles — first-time users always have only `traveller` and will see `/welcome`; if they pick Traveller we navigate to `/` and they never see it again because we set a `localStorage` `travidz:welcomed` flag.
- **`src/lib/roles.functions.ts`** — new server fn `selfAssignCreatorRole` (wraps existing `becomeCreator` logic from `mux.functions.ts` so onboarding doesn't depend on the Mux module). `mux.functions.ts` `becomeCreator` keeps working unchanged.
- **`src/routes/reset-password.tsx`** — new public route. Reads `type=recovery` from `window.location.hash`, shows a single password input + confirm, calls `supabase.auth.updateUser`, then redirects to `/login` with a success toast.
- **`src/routes/login.tsx`** — add "Forgot password?" link below the password field; clicking it prompts for email (inline) and calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`.
- **Auth emails** — call `email_domain--check_email_domain_status`. If no domain, show the email setup dialog and pause. After the user completes setup, scaffold the six templates, apply brand styling (primary color from CSS variables, white body, Compass-inspired header), and let DNS verification finish in the background.

## Smoke test checklist (we'll run after build)

1. Sign out → sign up with a new email → see `/welcome` → pick **Creator** → land on `/create` ready to upload.
2. Sign out → sign up again → pick **Traveller** → land on `/` → reload → don't see `/welcome` again.
3. Sign out → sign up again → pick **Business** → land on `/business/apply`.
4. Sign out → on `/login` click **Forgot password?** → enter email → see "check your inbox" toast.
5. Click the recovery link in the email → land on `/reset-password` → set new password → redirected to `/login` → sign in with new password.
6. Confirm branded auth emails arrive from the configured sender once DNS is green.

Once all six pass, I'll move to item 2 (Business onboarding + deals CRUD).
