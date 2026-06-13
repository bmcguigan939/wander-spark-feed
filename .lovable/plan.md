## What's actually happening

The Stays-vs-Activities fork (`Step0BusinessType` in `src/routes/business.setup.tsx`) only renders when `profile.setup_business_type` is `null`. Test/existing business profiles already have it set to `"stay"` (that's why the dashboard checklist says "Add property photos" and the wizard drops you straight into Step 1), so the fork is effectively invisible — there's no way to reach it again, and the dashboard CTA doesn't expose the choice up front either.

We'll fix this on two surfaces so the path choice is unmistakable from the start, and changeable later.

## 1. Dashboard — surface the fork directly, before the wizard

In `src/routes/business.index.tsx`, when `setup_business_type` is not yet set, replace the single "Set up your listing → Start" card with **two side-by-side choice cards**:

- "I offer stays" — hotels, apartments, villas, B&Bs
- "I run activities" — tours, classes, experiences, rentals

Each card calls `saveSetupBusinessType` (already exists in `business-setup.functions.ts`) with the chosen value, invalidates `business-setup-state` + `bookable-status`, then navigates to `/business/setup`. That way the user can't miss the fork and lands in the correct path's Step 1 directly.

Once `setup_business_type` is set, keep the existing "Resume stay setup / Resume activity setup" card unchanged — but add a small **"Change path"** link in its corner that routes to `/business/setup?changePath=1`.

## 2. Wizard — allow re-choosing the path

In `src/routes/business.setup.tsx`:

- Honour `?changePath=1` (or a "Change path" button in the sticky header) by forcing `Step0BusinessType` to render even when `businessType` is already set. Pre-select the current value so it's clear what's in effect.
- After the user re-picks the same value: no-op, just continue. After picking a different value: save it, reset `setup_step_completed` to 0 (via existing `saveSetupBusinessType` + a tiny extension to clear step), invalidate caches, jump to Step 1 of the new path.
- Add a small "Change path" link in the sticky header next to "Save & exit" so the option is reachable mid-flow without losing your seat.

## 3. Light copy alignment

- Dashboard empty-state already branches on `accountKind` — no change.
- `OnboardingChecklist` rows ("Add property photos", "Add rooms / activity options") should switch their headline copy to match the chosen path ("Add property photos" for stays, "Add activity photos" for activities; "Add rooms & rates" vs "Add activity options"). Logic is unchanged.

## Files to edit

- `src/routes/business.index.tsx` — replace single CTA with two fork cards when type is unset; add "Change path" affordance when set.
- `src/routes/business.setup.tsx` — let `?changePath=1` / header link re-show `Step0BusinessType`; on path change, reset step counter and refetch.
- `src/lib/business-setup.functions.ts` — extend `saveSetupBusinessType` to optionally reset `setup_step_completed` to 0 when the type actually changes.
- `src/components/business/OnboardingChecklist.tsx` — branch the two affected row titles on `accountKind`.

## Out of scope

- Step 0 card visuals beyond what's already there.
- 11-vs-16 step counts and the underlying save functions.
- Any DB schema, RLS, commission, pricing changes.
- DealForm — already path-aware from the previous turn.

## Acceptance check

1. Brand-new business → dashboard shows two fork cards ("I offer stays" / "I run activities"); picking one drops them into that path's Step 1.
2. Existing test profile (already `"stay"`) → dashboard shows resume card with a visible "Change path" link; clicking it returns to Step 0 with "Stays" pre-selected; picking "Activities" resets the wizard to activity Step 1.
3. The wizard sticky header always exposes a "Change path" link so the user is never locked in.
