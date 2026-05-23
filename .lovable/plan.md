# Fix the "Smart deals" sheet after upload

## What this screen is

After a user uploads a video from `/create`, the app opens the **Smart Deals sheet** (`src/components/create/SmartDealsSheet.tsx`). It does three things in order:

1. Calls `suggestDealsForVideo` — Travidz AI looks for already-bookable activities matching the video's destination. If any are found, they're listed with checkboxes so the creator can attach them (the top 3 are pre-selected). Attaching means viewers can book in one tap and the creator earns commission.
2. If no bookable deals exist, the **Business Outreach panel** (the state in your screenshot) takes over. It polls `listSuggestionsForVideo` every 5s while the AI extracts business details (name, website, email, phone) from the video. A **Re-scan** button retriggers extraction.
3. When a suggestion appears, the creator can hit **Send collaboration contract**, which opens an inline form (`InviteForm`) that calls `createBusinessInvite` — Travidz then emails the business a contract at the standard commission split.

The sheet always has a **Skip / Attach** footer at the bottom.

## Why it doesn't scroll

Three problems combine on mobile:

1. **The sticky footer + bottom nav overlap.** The sheet container has `max-h-[85dvh] overflow-y-auto`, and the `Skip / Attach` row uses `sticky bottom-0`. The app's `BottomNav` is also `sticky bottom-0 z-50` and sits in the same stacking context — on a 798px viewport with browser chrome it visually clips the lower ~80px of the sheet, which is exactly where the footer and "Travidz handles the contract…" text live. That's why in the screenshot the footer is missing and the panel looks cut off.
2. **No scroll is actually triggered** because `overflow-y-auto` is on the *outer* white card. On this content height, the card hits 85dvh, but the area visible above the bottom nav is smaller than 85dvh, so the user sees a frozen panel with no scrollbar and no inertia.
3. **Render-time `setState` in `SmartDealsSheet`** (lines 47–50) sets default-selected deals during render instead of inside `useEffect`. It currently only fires once because of the size check, but it's a React warning waiting to happen and unrelated to scroll.

## Fix

Frontend-only change to `src/components/create/SmartDealsSheet.tsx`.

### Layout rework

Switch the modal card to a 3-row flex column so the middle section is the only scroller, and the footer is always reachable:

```text
[ header  — shrink-0 ]
[ scroll  — flex-1 overflow-y-auto, includes outreach panel + deals list ]
[ footer  — shrink-0, Skip / Attach, safe-area padding ]
```

Concretely:
- Card: `flex max-h-[90dvh] flex-col` (drop `overflow-y-auto` from the card).
- Header block (icon + title + close + intro paragraph): `shrink-0`.
- Wrap everything between the header and the footer in a `<div className="flex-1 overflow-y-auto -mx-5 px-5">` so the deal list and `BusinessOutreachPanel` scroll inside it.
- Footer: remove `sticky bottom-0`, make it `shrink-0 border-t border-border bg-card pt-3 pb-[max(env(safe-area-inset-bottom),0.5rem)]`. Move the small "Travidz earns a commission…" caption inside this footer block so it's always visible.

### Clear the bottom nav

The modal needs to render *above* the bottom nav and leave room for it:
- Bump the backdrop's `z-50` to `z-[60]` so the sheet sits above `BottomNav`.
- On mobile (`< sm`), give the backdrop `pb-[calc(env(safe-area-inset-bottom)+72px)]` so the bottom of the sheet card never hides behind the 64–72px nav.

### Render-time state bug

Replace the inline `if (data?.deals && selected.size === 0) setSelected(...)` with a `useEffect` keyed on `data?.deals` and `videoId` so default selection runs after render and resets when the sheet reopens for a different video.

### Out of scope

- Backend / AI extraction speed (separate from this screen — the polling in `BusinessOutreachPanel` already handles delays).
- Redesigning the outreach copy or the invite form.
- The studio auto-poll work shipped previously.
