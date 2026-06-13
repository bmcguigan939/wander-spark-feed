Improve readability of the bottom navigation bar so labels and icons are clearly visible against bright feed backgrounds.

Changes to `src/components/layout/BottomNav.tsx`:
- Raise the nav background opacity (from `bg-background/35` to roughly `bg-background/80`) and strengthen the border so the bar reads as a solid pill instead of a translucent wash.
- Darken inactive labels and icons (use `text-foreground/80` instead of `text-muted-foreground`) so the text has strong contrast on any feed color.
- Keep the active tab in primary color and the Create/Studio gradient pill unchanged.

No layout, size, or position changes. No other files touched.