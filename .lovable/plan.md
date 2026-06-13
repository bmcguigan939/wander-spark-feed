The fork already exists as Step 0 of `/business/setup`, but the **entry surfaces around it still speak "property"-only**, so users (and you) reasonably think activities aren't supported up front. Two things to fix.

## 1. Dashboard entry — generic until type chosen, type-aware after

`src/routes/business.index.tsx` currently hardcodes:

- "Set up your property" / "Resume property setup"
- `Step X / 16` (the stays path length)

Change it to:

- Before pick: **"Set up your listing"** with subline *"Stays or activities — pick your path"*. Button text "Start".
- After pick (`setup_business_type === "stay"`): **"Resume stay setup"**, `Step X / 16`.
- After pick (`setup_business_type === "activity"`): **"Resume activity setup"**, `Step X / 11`.

Read `setup_business_type` and `setup_step_completed` from the existing `fetchSetup()` query — no new server call. Also rename the wizard `<head>` title from "Set up your property — Travidz" to "Set up your listing — Travidz" so the browser tab matches.

## 2. New-deal form — derive category from the chosen path, don't re-ask

`src/components/business/DealForm.tsx` shows a freeform Category dropdown (Stay / Eat / Do / Tour / Transport / Other). For a business that already picked Stays in setup, "Do (activity, spa, experience)" is wrong and confusing (your second screenshot). Fix:

- On mount, look up `profile.setup_business_type` (reuse `useAccountKind()` — already wired against the bookable query so it dedupes).
- `kind === "stay"` → default `category = "stay"` and **hide the Category select** (render a small read-only "Category: Stay" line with a link back to `/business/setup` to switch paths).
- `kind === "activity"` → default `category = "do"` and restrict the select to `do | tour | other` (drop Stay, Eat, Transport).
- `kind === "unknown"` → keep current full dropdown (legacy / not-yet-onboarded fallback).

No DealForm callers need to change — the prop shape stays the same.

## 3. Light copy sweep so "property" isn't the only word on the entry

- `business.index.tsx` "Set up your property" CTA → done above.
- Wizard route `head.title` → done above.
- `OnboardingChecklist` already branches on account kind for downstream rows, so no change there.

## What's intentionally **not** changing

- Step 0 of the wizard itself — it already presents the Stays vs Activities cards.
- The 11-vs-16 step counts and the underlying `saveSetupActivity*` / `saveSetup*` functions.
- The DB schema, RLS, commission, or pricing logic.
- The dashboard checklist gating logic.

## Files edited (no new files, no migration)

- `src/routes/business.index.tsx` — generic CTA copy, type-aware resume label, dynamic step total.
- `src/routes/business.setup.tsx` — `<head>` title text only.
- `src/components/business/DealForm.tsx` — pull `useAccountKind()`, default + constrain the Category field.

## Acceptance check

1. Brand-new business → dashboard says **"Set up your listing"**, opens wizard at Stay/Activity fork.
2. Pick Activities → dashboard updates to **"Resume activity setup · Step X / 11"**.
3. Create a new deal as an activity business → Category is pre-set to "Do" and Stay/Eat/Transport aren't offered.
4. Stay business creating a deal → no Category dropdown at all; small "Category: Stay · Change path" link.
