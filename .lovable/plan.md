## Goal
Remove the `founders@travidz.com` contact email entirely from the live investor pitch page (`/invest`) so investors do not mistake it for a direct line.

## Changes

### `src/routes/invest.tsx`
1. **Remove** the `CONTACT_EMAIL` constant (line 22).
2. **Remove** the sticky-bar "Let's talk" mailto button (lines 109–114). Keep the Copy link, PDF, and PPTX buttons.
3. **Remove** the footer CTA mailto button (lines 605–610). Keep the "Explore the live app" button and the rest of the footer copy.
4. **Remove** the `Mail` import from `lucide-react` if no longer used.

## Outcome
The investor pitch page will no longer display or link to `founders@travidz.com` anywhere.