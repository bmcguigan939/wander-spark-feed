## Two small UI fixes on the feed

### 1. Kill the cream strip at the top of the feed
The video should reach the very top of the screen — the Following / For you / Latest pills and notifications bell overlay the video like they already do, but right now `MobileShell` adds a safe-area top padding so the cream background shows above the video.

- In `src/routes/index.tsx`, render `<MobileShell fullBleed>` on the feed (it already exists as a prop — just currently unused here). This drops the top padding so the video card sits flush under the status bar, exactly like the attached screenshot's intent.
- The tab pills + bell already sit `absolute top-3` with their own backdrop blur, so they remain readable over the video with no cream band behind them.

### 2. Slimmer bottom nav tucked under the feed info
Edit `src/components/layout/BottomNav.tsx` only:

- Reduce overall height: `py-1.5` → `py-1`, icon size `h-5 w-5` → `h-[18px] w-[18px]`, label text `text-[10px]` → `text-[9px]`, gap `gap-1` → `gap-0.5`.
- Tighten the pill: `px-2` → `px-1.5`, and shrink the Studio/Create primary chip from `px-3 py-1.5` → `px-2.5 py-1` so it no longer dominates vertically.
- Slightly narrower container: `w-[min(24rem,calc(100%-1.5rem))]` → `w-[min(22rem,calc(100%-1.25rem))]` so it reads as a slim floating bar rather than a full tray.
- Keep the rounded-full glass styling, shadow, and safe-area bottom offset unchanged.

No changes to routing, feed logic, video cards, or any other screen.

### Files touched
- `src/routes/index.tsx` (one prop)
- `src/components/layout/BottomNav.tsx` (size tokens only)
