## Use the lowercase-t favicon as the top-left logo

Swap the top-left lockup image in `src/components/landing/LandingPage.tsx` from `@/assets/app-icon-1024.png` (uppercase T) to the lowercase-t mark at `public/icon-512.png` — the same one we generated for Google Search results.

### Change
- Remove `import appIcon from "@/assets/app-icon-1024.png"`.
- Change the `<img>` in `TopBar` to `src="/icon-512.png"` (served straight from `public/`), keeping `alt="Travidz logo"` and `className="h-8 w-8 rounded-xl object-cover"`.
- The surrounding `<Link to="/">` stays, so the logo remains clickable.

No other changes.
