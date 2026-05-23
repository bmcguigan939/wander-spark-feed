## Current state
Editing already works end-to-end: `/business/deals/$id/edit` loads the deal into `DealForm`, saves via `updateDeal` server fn, supports calendar sync and delete. The dashboard ("BBM Best Stays" card in the screenshot) already shows a tiny pencil icon at the right that links to it — but it's a 14px icon with no label, so businesses don't notice it.

## Problem
The edit affordance isn't discoverable. The user couldn't tell their live deal is editable.

## Fix — `src/routes/business.index.tsx` deal card only

1. **Make the whole card tappable**: wrap the card body in a `Link` to `/business/deals/$id/edit` so tapping anywhere on "BBM Best Stays" opens the edit screen.
2. **Replace the pencil icon with a labelled button**: `Edit` pill (icon + text) using `bg-secondary text-secondary-foreground rounded-full px-3 py-1.5 text-xs font-medium`, top-right of the card. Keeps the existing route but makes it obvious.
3. **Add a small helper line** under the location: `Tap to edit price, photo, description…` in `text-[11px] text-muted-foreground` so first-time users understand.
4. Stop event propagation on the Edit button so it doesn't double-fire with the card link.

## Out of scope
- No changes to the edit page itself (already complete: form, calendar sync, delete).
- No changes to `DealForm`, server fns, or DB.
- No new routes.

One file touched: `src/routes/business.index.tsx`.
