# Smart deals sheet: buttons not functioning

## What's actually happening

In your screenshot the sheet is in the **"no bookable deals yet"** branch — `data.deals.length === 0`, so the `BusinessOutreachPanel` is shown. Three buttons are visible:

1. **Re-scan** (inside the outreach panel) — wired to `rerunBusinessExtraction`. Works, but gives almost no visible feedback: the label flips to "Re-scanning…" for a fraction of a second and a single toast fires. On mobile that reads as "nothing happened".
2. **Skip** — calls `onClose`. In `create.tsx`, after publishing, `onClose` only does `setSmartDealsOpen(false)` (the navigate branch is guarded by `!publishedVideoId`). So the sheet closes silently and the user lands back on the share card behind it — visually almost identical to the sheet view because of the backdrop blur, so it feels like the tap did nothing.
3. **Attach** — `disabled={selected.size === 0 || attachM.isPending}`. With zero deals in the list there is nothing to select, so it is **permanently disabled** in this state. That's the "button doesn't work" the user is actually hitting.

So nothing is z-index / overlay related. The footer just doesn't make sense in the empty-deals branch, and the outreach panel's actions don't give enough feedback.

## Fix (frontend-only, `src/components/create/SmartDealsSheet.tsx`)

### 1. Footer adapts to state

Track whether we're in the no-deals branch (`hasDeals = (data?.deals?.length ?? 0) > 0`).

- **Has deals** → keep current `Skip` / `Attach (n)` row.
- **No deals (outreach mode)** → replace the two-button row with a single full-width **Close** button (calls `onClose`). Remove the "Travidz earns a commission when viewers book" caption in this state (the outreach panel already shows its own commission line); keep it only when deals exist.
- **Still loading** (`isLoading` and no data yet) → render the footer with `Skip` only, no `Attach`.

### 2. Re-scan feedback

In `BusinessOutreachPanel`:

- While `rescanM.isPending`, swap the empty-state copy from "Still looking. This usually takes under a minute after upload." to "Re-scanning the video… this can take ~30s." so the user sees the state change in place, not just in the button label.
- After success, keep the existing toast and refetch; also briefly disable the button for ~3s to prevent spam taps (already covered by `isPending` while in flight, plus a short cooldown via `setTimeout` clearing a local `justRescanned` flag).

### 3. Skip → Close clarity

Even with #1 in place, after publishing the parent's `onClose` only hides the sheet. That's correct behaviour (user is back on the share card with "Attach booking deals" still available), but add a one-line toast `"You can attach deals later from Studio → Videos."` on close **only** when the sheet was opened in the no-deals branch, so the tap has visible confirmation. Implement by passing an optional `onSkipNoDeals?: () => void` from `create.tsx`, or by firing the toast inside `SmartDealsSheet` itself when Close is pressed in the no-deals state.

### 4. Sanity pass on the card

While in the file, remove the now-empty `<ul className="mt-4 space-y-2">` render when `data?.deals` is empty (it currently renders an empty `<ul>` with top margin under the outreach panel, adding dead space).

## Out of scope

- Backend extraction speed / Mux processing (separate work).
- Layout / scrolling — those were fixed last turn and are working in the screenshot.
- Any change to `ShareToSocialsCard`, `BottomNav`, or routing.

## Verification

After implementing, with the preview at 440×798:

1. Open `/create`, publish a test video, tap **Attach booking deals**.
2. With zero suggestions: verify the footer shows a single **Close** button that closes the sheet and fires the "attach later" toast. Verify **Re-scan** updates the inline copy to "Re-scanning…" and toasts on success.
3. Force a deals-present state (or pick a destination known to have deals) and confirm the original `Skip` / `Attach (n)` footer still works.
