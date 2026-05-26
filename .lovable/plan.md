
## Goal

Give admins the ability to block, unblock, and permanently delete user accounts from the Users tab — plus a smart "blocklist" that prevents banned users from sneaking back in under a new account, and a review queue for flagged signups so admins always have the final say.

## What changes

### 1. Block / unblock / delete actions on each user card

On `/admin/users`, every user row gets three new actions in a small menu:

- **Block** — instantly signs them out, freezes their account, hides their videos and deactivates their deals. Reversible.
- **Unblock** — lifts the block.
- **Delete account** — permanent removal of the auth user and their profile (with confirm dialog). Their content is either hard-deleted or anonymised (we'll anonymise videos/deals so historical bookings stay intact).

A blocked user attempting to log in sees a clear "Your account has been suspended" message. All their server functions reject with 403.

### 2. Smart blocklist (re-signup prevention)

When an account is blocked or deleted, we capture identifying fingerprints into a new `blocked_identities` table:

- Email (normalised: lowercased, gmail dots stripped, `+tag` removed)
- Phone number (if collected)
- Stripe Connect payout account ID / last4 of bank account
- IP address(es) seen on the account
- Device fingerprint hash (if available from existing client signals)
- Business name + website URL

On every new signup, business claim, and Stripe Connect onboarding, we check incoming details against `blocked_identities`. Three outcomes:

- **Hard match** (same email/phone/bank) → signup blocked outright with "This account cannot be created. Contact support."
- **Soft match** (same IP, device, business name, or website) → account is created but flagged `pending_admin_review`, hidden from public feeds until cleared.
- **No match** → normal flow.

### 3. Admin review queue (flagged signups)

New filter chip on Users: **Flagged**. Lists every account with `pending_admin_review = true`, showing why they were flagged (which fingerprint matched which blocked account). Admin has two buttons:

- **Approve** — clears the flag, account becomes fully active.
- **Reject** — blocks the new account and adds its fingerprints to the blocklist.

### 4. Nice-to-haves admins will benefit from

I'd recommend also adding (small additions, same screen):

- **Impersonate / View as user** (read-only session) for support investigations.
- **Send admin note / message to user** that surfaces as an in-app banner.
- **Force password reset** button.
- **Recent activity panel** per user (last login IP, last 10 actions, signup IP) to help judge flagged cases.
- **Audit log export** of all admin actions (we already log to `admin_actions` — just a download button).

## Technical notes

**New tables (one migration):**
- `blocked_identities` — `kind` (email|phone|bank|ip|device|business_name|website), `value_hash`, `original_user_id`, `reason`, `blocked_at`, `blocked_by`.
- Add to `profiles`: `is_blocked boolean`, `blocked_at`, `blocked_by`, `block_reason`, `pending_admin_review boolean`, `review_reason text`, `signup_ip inet`, `last_login_ip inet`.
- `user_signals` (lightweight) — `user_id`, `ip`, `device_hash`, `seen_at` for IP/device history.

**New server fns in `src/lib/admin.functions.ts`:**
- `blockUser`, `unblockUser`, `deleteUserAccount` (uses `supabaseAdmin.auth.admin.deleteUser`).
- `approveFlaggedUser`, `rejectFlaggedUser`.
- `getUserAuditDetail` for the activity panel.

**New helper `src/lib/blocklist.server.ts`:**
- `fingerprintEmail`, `fingerprintPhone`, normalisers.
- `checkBlocklist(signals)` → `{ hardMatch, softMatches }`.
- Called from signup hook, business invite accept, and Stripe Connect onboarding.

**Auth enforcement:** add `assertNotBlocked(userId)` to `requireSupabaseAuth` middleware so every server fn rejects blocked users. Client `onAuthStateChange` checks `is_blocked` and signs them out.

**UI:** extend the existing user card with a "⋯" menu (Block / Unblock / Delete / Force reset / Impersonate). Add **Flagged** filter chip next to All/Trusted/Untrusted. Flagged cards show match reason inline with Approve / Reject buttons.

## Out of scope (flag for later)

- True device fingerprinting library (FingerprintJS) — we'll use a simple hash of UA + screen + tz for now.
- Cross-account graph analysis ("show me all accounts sharing this IP").
- Automated risk scoring / ML.
