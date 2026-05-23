## Add a live password strength meter to business signup

Add a real-time strength indicator under the **Password** field on `src/routes/business.signup.tsx`, and block submission until the score is "Good" or better. This catches weak passwords before Supabase's HIBP check rejects them, which is what the user just hit on the screenshot.

### Behaviour

- As the user types, score the password and show a 4-segment bar (Weak → Fair → Good → Strong) plus a one-line label and the most useful next tip ("add a number", "make it longer", "avoid common words").
- The **Create account & accept** button stays disabled until the score is at least **Good** (in addition to the existing length / match / T&C checks).
- Keep Supabase's HIBP rejection as a backstop — if a password somehow passes the meter but is in the breach list, we still surface the existing error inline, just with friendlier wording ("This password has appeared in a known data breach — please choose another").

### Scoring

Use a small dependency-free scorer (no `zxcvbn` — it's ~400KB and overkill for one screen). Roughly:

- +1 length ≥ 10, +1 length ≥ 14
- +1 mixed case, +1 has digit, +1 has symbol
- −2 if it matches a tiny built-in common-passwords list (`password`, `123456`, `qwerty`, `letmein`, etc.) or contains the user's email local-part
- Map total → `weak | fair | good | strong`

Lives in a new helper `src/lib/password-strength.ts` so we can reuse it on `/login` signup and `/reset-password` later if needed (out of scope to wire those up now).

### UI

Small component inline in the signup file (or co-located `PasswordStrengthMeter.tsx` under `src/components/`):

```text
[████░░░░░░░░]  Fair
Try adding a number or symbol.
```

Colours pulled from existing tokens — `bg-destructive` (weak), `bg-amber-500` via a token, `bg-primary` (good), `bg-emerald-500` (strong). Matches the existing dark/minimal style already on the page.

### Files

- **new** `src/lib/password-strength.ts` — pure scoring function + tip generator.
- **new** `src/components/auth/PasswordStrengthMeter.tsx` — bar + label + tip, takes `{ password, email }` props.
- **edit** `src/routes/business.signup.tsx` — render the meter under the Password input, gate the submit button on `score >= 2` ("Good"), and soften the HIBP error message.

### Out of scope

- Wiring the meter into `/login` signup or `/reset-password` (can be a follow-up).
- Server-side strength enforcement — Supabase's HIBP check already covers the breach case.
- Replacing the current Supabase HIBP setting.