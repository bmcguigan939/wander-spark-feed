## Problem
The feed (`h-dvh`) and the sticky `BottomNav` are siblings inside `main`. The nav (~56px + safe-area) overlays the bottom of the feed, so the `VideoCard` bottom overlay (caption, business chip, deal card, CTA row) and the right-rail action buttons get hidden behind it. The prior patch attempt was lost — current values are still `bottom-4` / `bottom-32` / `h-64`.

## Fix (single file: `src/components/feed/VideoCard.tsx`)

1. **Bottom overlay** (line 303): `bottom-4` → `bottom-[calc(env(safe-area-inset-bottom)+84px)]` so the caption + deal card sit clearly above the nav.
2. **Right-rail actions** (line 287): `bottom-32` → `bottom-[calc(env(safe-area-inset-bottom)+196px)]` so like/save/share stay above both the nav and the lifted overlay.
3. **Bottom scrim** (line 262): `h-64` → `h-80` so the gradient still covers the lifted text for legibility.

No changes to BottomNav, feed container, or any data/logic. Mobile-only impact since the shell is `max-w-md`.
