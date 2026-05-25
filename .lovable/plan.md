## Goal
Make `support@travidz.com` easy to discover across the marketing site and the authenticated app, without UI clutter.

## Scope (starter set — 3 placements)

### 1. Landing footer
File: `src/components/landing/LandingPage.tsx` (`Footer` component, lines 336–351)

Add a "Contact" entry to the existing footer nav:
- New link: `support@travidz.com` → `mailto:support@travidz.com`
- Placed between "For businesses" and "Terms" so it sits with primary links
- Uses existing footer typography (no new styles)

### 2. /support page
File: `src/routes/support.tsx`

The page is currently an AI chat. Add a small, always-visible "Prefer email?" line near the top (under the header) with:
- Text: "Prefer email? Reach a human at support@travidz.com"
- Email rendered as a `mailto:` link in `text-primary`
- Keeps the AI chat as the main flow; email is the fallback

### 3. Profile menu
File: `src/routes/profile.tsx` (above the "Sign out" row at ~line 354)

Add a new row:
- Icon: `Mail` (lucide-react)
- Label: "Contact support"
- Action: `mailto:support@travidz.com?subject=Travidz%20support`
- Same row styling as other profile actions

## Out of scope (deferred until needed)
- FAQ closer, error/empty-state copy, booking confirmation pages, transactional email footers, business dashboard help link. We'll add these once the starter set is live and we see if support volume warrants it.

## Verification
- Visual check on the landing footer (desktop + 440px mobile)
- Visual check on `/support` and `/profile`
- Click each mailto to confirm it opens the user's mail client with the correct recipient

No backend, database, or migration changes. Pure frontend.
