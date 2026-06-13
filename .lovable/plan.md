# Fix: setup wizard footer hidden behind bottom nav

## What the user sees
On Step 12 (Rooms & rates) there are `Save room` and `Save rate` buttons inside each card, but no visible way to move on to Step 13. In the screenshot the wizard's Back button is truncated to "Ba…" and a pink dot is peeking from under the bottom tab bar — those are the real Back / Continue buttons.

## Root cause
- `business.setup.tsx` wraps the whole wizard in `<MobileShell>`, which renders the global `BottomNav` (`sticky bottom-0`, `z-50`).
- Each step renders `<StickyFooter>` (`fixed inset-x-0 bottom-0`, `z-20`) with the Back + Continue buttons.
- `BottomNav` sits on top of `StickyFooter`, so Back/Continue are visually covered. `Save room` / `Save rate` only persist a single card — they were never meant to advance the wizard.

## Change

**File:** `src/routes/business.setup.tsx`

Replace the `MobileShell` wrapper with a plain max-width column wrapper, so the global `BottomNav` is not rendered during the multi-step setup wizard:
- Drop the `MobileShell` import.
- Render the header + step content inside a simple `<div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-background">` (same container shape `MobileShell` uses, minus `<BottomNav />`).
- Keep the existing sticky top header and per-step `<StickyFooter>` exactly as they are; with the bottom nav gone, Back and Continue become fully visible on every step, including Step 12.

That's the only change needed — the per-step `StickyFooter` already implements the "next step" button (with label "Continue", or "Finish setup" on the last step) and is correctly wired to `next()` → `markSetupStepComplete`. The user's reported "no way to advance from Step 12" is purely a z-index / layout occlusion bug.

## Why not add a new "Next" button in Step 12
The `StickyFooter` Continue button already exists for Step 12 (see `Step12FirstUnit`, around line 1472). Adding a second next button would be duplicative — fixing the occlusion exposes the existing one and the same fix benefits every step of the wizard (not just 12), which today all have the same hidden footer on devices where the bottom nav overlaps.

## Out of scope
- Per-card `Save room` / `Save rate` buttons stay as-is — they are intentional "save this card" actions inside `RoomsAndRatesEditor`, distinct from the wizard's "go to next step" action.
- No changes to `RoomsAndRatesEditor`, `UnitPhotosUploader`, or any other step's logic.
