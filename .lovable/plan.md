# Scroll invite page to top on load

The accept-invite page (`/business/invite/$token`) currently opens mid-page for some users because the page is tall and the browser restores or guesses a scroll position from the email-app webview.

## Change

`src/routes/business.invite.$token.tsx` — add a small `useEffect(() => { window.scrollTo(0, 0); }, [])` at the top of the component so the page always lands at the top on first render, regardless of how the user arrived (email webview, share, refresh).

## Out of scope
- Global scroll restoration tweaks for other routes.
- Reworking the page layout / shortening it.
