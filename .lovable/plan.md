## Goal

Make the cookie banner a one-time decision per **signed-in user**, synced across every device they log in on. Signed-out visitors still get the per-browser localStorage behavior we already have.

## How it works

1. Add a `cookie_consent` column to the existing `profiles` table (`text`, nullable — values: `accepted` | `essential`, plus `cookie_consent_at` timestamp).
2. On sign-in, the banner reads the user's profile. If `cookie_consent` is set → never show again on any device.
3. When a signed-in user picks "Accept all" or "Essential only", we save to both `localStorage` (instant) and the profile (cross-device).
4. If a user picked an option while signed out, then signs in and has no server value yet, we backfill their localStorage choice to the profile so it sticks across their devices going forward.

## Files changed

- **Migration** — add `cookie_consent` + `cookie_consent_at` to `profiles`.
- **`src/lib/cookie-consent.functions.ts`** (new) — two auth-protected server fns: `getCookieConsent`, `setCookieConsent`.
- **`src/components/CookieConsent.tsx`** — when a user is signed in, check the server value before showing; on choice, persist to both localStorage and the profile; on first sign-in, backfill local choice to server.

## Behavior summary

| State | Behavior |
|---|---|
| Signed-out, no choice | Banner shows; choice saved to localStorage |
| Signed-out, chose before | No banner (localStorage) |
| Signed-in, ever chose on any device | No banner (profile) |
| Signed-in on new device, never chose | Banner shows once; saves to profile |
| Signed-in, only had localStorage choice | Silent backfill to profile, no banner |

No changes to the legal/cookies page itself.
