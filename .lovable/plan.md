## Finish the remaining price-match slices

Three items left from the earlier plan. All are wiring/UI — no schema changes.

### 1. Per-deal OTA URLs in create/edit forms

Add a "Where else is this listed?" section to:
- `src/routes/business.deals.new.tsx`
- `src/routes/business.deals.$id.edit.tsx`

Reuse `CompetitorUrlsEditor` (already business-scoped). Render it as a collapsed/optional panel under the main deal fields with a short explainer: "Pinning your Booking.com / Expedia / GYG listing lets us match the exact room or ticket. Leave blank and we'll search by name." Since the editor writes business-level URLs, the copy will make clear this applies to all deals on that network — no per-deal override yet.

### 2. Thread `room_id` / `room_name` through the scan

`runDealPriceMatch` already accepts `room_id` + `room_name`. Wire them in:

- `src/lib/price-match.scan.functions.ts` — extend the Zod input with optional `room_id` (uuid). When present, look up the room from `deal_rooms` (name, occupancy) and pass `room_id` + `room_name` + adjust `guests` default to room occupancy when caller didn't provide one.
- `src/components/PriceMatchBadge.tsx` — accept optional `roomId` prop, include in the React Query key, and forward in the `scan({ data })` call.
- `src/routes/book.$dealId.tsx` (and any other page rendering `PriceMatchBadge` with a selected room) — pass the currently selected `roomId` so the scan keys per room.

### 3. Broken-pin chip on `OnboardingChecklist`

`src/components/business/OnboardingChecklist.tsx` — add a small warning chip when any `business_competitor_urls` row has `last_status` in (`broken`, `wrong_domain`, `no_price`). Use the existing `listMyCompetitorUrls` server fn via `useServerFn` + `useQuery`. Chip links to `/business/price-audit?tab=urls` (same deep-link the banner uses). Keep it visually consistent with the other checklist warning chips — yellow tone, single-line copy: "N pinned listing(s) need attention".

### Out of scope

- Per-deal URL overrides (would need a new `deal_competitor_urls` table — defer until a user actually asks).
- Official partner APIs.
- Refactoring `CompetitorUrlsEditor` into a per-deal variant.

### Files touched

- `src/routes/business.deals.new.tsx`
- `src/routes/business.deals.$id.edit.tsx`
- `src/lib/price-match.scan.functions.ts`
- `src/components/PriceMatchBadge.tsx`
- `src/routes/book.$dealId.tsx`
- `src/components/business/OnboardingChecklist.tsx`
