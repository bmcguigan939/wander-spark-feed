## Goal

The 16-step setup wizard is the single source of truth during onboarding. All overlapping dashboard surfaces stay hidden until `profiles.setup_completed_at` is set. After completion they re-appear as ongoing **management** cards (no longer onboarding prompts).

## Duplications being resolved

| Topic | Wizard step | Dashboard surface (hide until setup done) |
|---|---|---|
| Channel manager / iCal | Step 5 | `ChannelManagerCard` |
| Property photos | Step 13 | "Add property photos" row in checklist |
| Rooms / pricing / cancellation | Steps 12 + 14 | "Add rooms / activity options" row |
| Stripe payouts / bank | Step 11 | `PayoutMethodCard`, "Connect bank with Stripe" amber card, "Set up payouts" checklist row |
| Business agreement | Step 15 (legal entity) | "Accept business agreement" checklist row |
| Business address | Step 4 | `BusinessLocationPrompt` banner |

## Changes

### `src/routes/business.index.tsx`
- Compute `setupDone = !!profile.setup_completed_at` (already in the file as `setupDone`).
- While **not** `setupDone`:
  - Keep showing the "Resume stay/activity setup" CTA and the path-picker (the wizard entry point).
  - **Hide** `OnboardingChecklist`, `BusinessLocationPrompt`, `PayoutMethodCard`, `ChannelManagerCard`.
- When `setupDone`:
  - Hide the "Resume setup" CTA.
  - Show `PayoutMethodCard`, `ChannelManagerCard`, `BusinessLocationPrompt` (if location still missing) as management cards.
  - Drop `OnboardingChecklist` entirely (its steps are now wizard-owned). Component file stays in repo but no longer mounted; safe to delete in a follow-up.

### `src/components/business/ChannelManagerCard.tsx`
- No behavioural change; it now renders only post-setup, so copy can shift from "Connect your hotel/PMS once…" (onboarding tone) to "Manage your channel-manager feeds" (management tone). Outbound iCal URL list and "Sync now" remain.

### `src/components/business/PayoutMethodCard.tsx`
- Same idea — adjust headline to "Payout method" management framing (no "Set up payouts" CTA copy).

### `src/components/business/OnboardingChecklist.tsx`
- Stop mounting it. No file edit required this PR; leave for cleanup once the new flow is validated.

### Wizard (`src/routes/business.setup.tsx`)
- No structural changes. Step 5 (channel manager), Step 11 (payments/Stripe), Steps 12–14 (units/photos/pricing), Step 15 (legal/agreement) remain as the single onboarding path.

## Non-goals (deferred)

- Deleting `OnboardingChecklist.tsx`, the amber "Connect bank with Stripe" card, or any wizard step files. Keep them around one release in case we need to roll back.
- Changing the wizard step count or copy.
- Touching the activity (11-step) path independently — the same `setupDone` gate covers both because both paths set `setup_completed_at` in Step 16/Step 11 Go-Live.

## Acceptance

- A brand-new business sees: path picker → "Resume setup" CTA only. No checklist, no channel-manager card, no payout card, no location prompt.
- A business mid-wizard sees the same — just the resume CTA.
- A business that finished the wizard sees: payout card, channel-manager card, location prompt (if applicable), and the rest of the dashboard (deals list, creator apps, messages, etc.). No "Resume setup" CTA, no checklist.
