## Problem

On every legal page (`/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/creator-agreement`, `/legal/business-agreement`, `/legal/dmca`), the header "Back" link is hardcoded to `/` (the feed). So a user who navigated from, say, the Business onboarding screen always lands on the feed instead of where they came from.

Source: `src/components/layout/LegalPage.tsx`
```
<Link to="/" ...>Back</Link>
```

## Fix

Replace the hardcoded `<Link to="/">` in `LegalPage.tsx` with a button that goes back in browser history, falling back to `/` only when there is no previous entry (e.g. the user opened the legal page directly in a new tab).

### Implementation details

In `src/components/layout/LegalPage.tsx`:

- Import `useRouter` from `@tanstack/react-router`.
- Replace the `<Link to="/">…Back</Link>` with a `<button>` that calls `router.history.back()` when `window.history.length > 1`, otherwise navigates to `/` via `router.navigate({ to: "/" })`.
- Keep the same visual styling (icon + "Back" label, muted hover color) so nothing else changes.

No other files need to change — all six legal routes render through `LegalPage`, so a single edit fixes them all.

### Out of scope

- The footer nav links at the bottom of the legal pages (those are intentional cross-links between policies).
- The `AgreementBanner` component and any other "Back" affordances elsewhere in the app.
