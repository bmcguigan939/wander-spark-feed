## Goal
Collab default terms (deliverables, comp nights, usage rights, brand do's/don'ts, hashtags, mentions) are a platform-level commitment from Travidz — every business gets the same terms so creators have a consistent experience. The current page lets each business build bespoke defaults, which contradicts that. Lock those fields to platform presets and show them as read-only. Keep **Auto-accept rules** fully editable per business — those are legitimately per-operator (their own follower thresholds, GBV minimums, monthly caps, etc.).

## Changes

### 1. `src/routes/business.collabs.tsx`
Replace the editable "Default terms" section with a read-only summary card sourced from `RECOMMENDED_DEFAULTS`:

- Remove: `deliverables`, `nights`, `usage`, `dos`, `donts`, `tags`, `mentions` state; the form inputs; the Save button; the `applyRecommended()` helper; the `saveDefaultsMut` mutation; the `useEffect` that hydrates defaults from `d`.
- Remove imports of `upsertMyCollabDefaults`, `RECOMMENDED_DEFAULTS` (re-import the latter from collabs.functions for display), `Input`, `Sparkles` (if unused elsewhere), `Label` (if unused elsewhere).
- Render a static "Default terms" card showing each value with a small "Set by Travidz" badge in the header. Bullet list for deliverables, two stat tiles for comp nights / usage rights, paragraphs for brand do's/don'ts, chip rows for hashtags and mentions.
- Update the page subtitle to: *"Travidz sets the collab terms below so creators get a consistent experience across every business. You control who you accept using the Auto-accept rules underneath."*

The **Auto-accept rules** section (and its state, mutation, and Save button) stays untouched.

### 2. `src/components/business/OnboardingChecklist.tsx`
The "Set your collab defaults" gate currently completes when `getMyCollabDefaults` returns a row, which the user can no longer create from the UI. Replace the gate so it tracks something the operator actually does: completing **Auto-accept rules** (`rules.auto_accept_enabled === true` OR a non-null `min_followers/min_rolling_gbv_cents/manual_review_above_followers`). Use `getMyCollabRules` (already exported) via a new `useQuery` and update the step's `done` predicate. Title becomes "Set your auto-accept rules", desc "Tell us who to instantly accept and who lands in your inbox." Link stays `/business/collabs`.

### 3. Leave server-side intact
Do **not** delete `upsertMyCollabDefaults`, `DefaultsInput`, or the `business_collab_defaults` table — they're referenced from `getMyCollabApplication` and may be reused for future per-business overrides (e.g. localized hashtags). They simply stop being called from the UI.

## Out of scope
- Schema changes / migrations.
- Touching the Auto-accept rules card itself.
- Admin tooling to edit the platform presets (currently hardcoded in `RECOMMENDED_DEFAULTS`).