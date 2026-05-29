## Fix new-listing crash + collapse checklist steps

Two related problems on the operator onboarding checklist:

1. **Crash on "Add rooms / activity options"** — clicking Open routes through `/business/deals/new`, which now bootstraps a draft with `status: "draft"`. The Postgres check constraint `deals_status_check` only allows `pending_review | approved | rejected | expired`, so the insert fails with the toast in the screenshot.
2. **Redundant checklist rows** — "Set prices" and "Connect your calendar" each have their own row + Open button, but all three (rooms, prices, calendar) now live on the same unified setup page. They should not be separately clickable steps before a listing exists.

### Changes

**1. Migration — allow `draft` status**

```sql
ALTER TABLE public.deals DROP CONSTRAINT deals_status_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_status_check
  CHECK (status = ANY (ARRAY['draft','pending_review','approved','rejected','expired']));
```

No data backfill needed; existing rows already use the legacy values.

**2. `src/components/business/OnboardingChecklist.tsx`**

- Drop `rates` and `calendar` from the displayed `ALL_GATES` array. The bookable-status backend still tracks them (so the operator is still gated from going live until prices + calendar are set), but they don't show as separate Open buttons in the checklist UI.
- The remaining gates the operator clicks are: agreement → photos → items (Add rooms / activity options) → payouts → collab-rules. Each routes to a page that fully handles its scope.
- The "Add rooms / activity options" copy gets a small append: "Add each room/option, set its price, and connect your calendar." so the operator knows the next page covers all three.

**3. Out of scope**

- No changes to `business.deals.$id.edit.tsx` (the unified page already exposes rooms/rates/calendar sections).
- No changes to `gateLinkFor` for `rates`/`calendar` — they're just not rendered.
- No changes to `getBookableStatus` — the server still enforces all gates before flipping a listing live.

### Risk

If an operator has rooms but no prices/calendar, the checklist will say "Add rooms / activity options" is the only outstanding setup item — but clicking it lands them on the unified page where the same "Set prices" and "Calendar feeds" sections live. The page itself remains the source of truth. Acceptable.
