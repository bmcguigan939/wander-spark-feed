Two small accessibility fixes:

1. **Category filter chips (`src/components/map/CategoryChips.tsx`)** — make all six chips fit common phone widths instead of running off-screen.
   - Tighten chip sizing (smaller horizontal padding, slightly smaller text and icon, smaller gap) so the full row fits at ~360–414px wide.
   - Keep the existing horizontal scroll fallback so it still works on very narrow viewports or when labels are translated to longer strings.

2. **Bottom nav labels (`src/components/layout/BottomNav.tsx`)** — make inactive items fully readable on any background.
   - Inactive icons and labels switch from `text-foreground/80` to solid `text-foreground` with `font-semibold` for stronger contrast.
   - Raise nav background from `bg-background/85` to `bg-background/95` so labels never sit on a translucent wash.
   - Active tab stays primary-colored; Create/Studio gradient pill unchanged.

No layout, position, or routing changes.