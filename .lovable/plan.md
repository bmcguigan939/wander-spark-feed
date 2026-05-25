## Add clickable Travidz logo to top-left of landing page

Replace the generic Compass icon in the `TopBar` lockup with the actual app icon. The existing `<Link to="/">` wrapper already makes the whole lockup (icon + wordmark) clickable and route to home — no extra wiring needed.

### Change
In `src/components/landing/LandingPage.tsx` `TopBar`:
- Import `appIcon from "@/assets/app-icon-1024.png"`.
- Replace the `<span>` containing the `<Compass>` icon with `<img src={appIcon} alt="Travidz logo" className="h-8 w-8 rounded-xl object-cover" />` so it matches the current footprint beside the "travidz" wordmark.
- Leave the surrounding `<Link to="/">` untouched so the logo is clickable and navigates to the homepage.

No other layout or routing changes.
