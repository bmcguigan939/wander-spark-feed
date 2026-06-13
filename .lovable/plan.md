## Problem

Dashboard cards "I offer stays" / "I run activities" just navigate to `/business/setup` without persisting the choice. The wizard's Step 0 (`Step0BusinessType` — "What does your business offer?") then asks the same question again.

## Fix

In `src/routes/business.index.tsx`, turn the two path-choice cards into buttons that:
1. Call `saveSetupBusinessType({ data: { setup_business_type: "stay" | "activity" } })` via `useServerFn` + `useMutation`.
2. Invalidate `["business-setup-state"]` and `["account-kind"]` query caches.
3. Navigate to `/business/setup` (which now skips Step 0 because the type is set, landing on Step 1 of the chosen path).

Disable both cards while the mutation is in-flight; show a toast on error.

No changes to `business.setup.tsx` — it already hides Step 0 once `setup_business_type` is set (unless `?changePath=1`).

No backend/schema changes.