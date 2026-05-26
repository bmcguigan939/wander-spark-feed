Scope the website-URL requirement to **activity operators only**. Stays/hotels never see it, never get blocked by it, and the price scanner skips host exclusion for them.

### Changes

**1. `src/lib/bookable.functions.ts`**
- In both `getBookableStatus` and `computeBookableStatus`: only push `"website"` into `missing` when `accountKind === "activity"`. Stays and `unknown` skip the gate entirely.
- Keep `business_website_url` in the profiles select (still needed to evaluate the gate when activity).
- `GATE_LABELS` / `GATE_LINKS` / `gateLinkFor` stay as-is (the gate type still exists; we just don't emit it for stays).

**2. `src/components/business/OnboardingChecklist.tsx`**
- `ALL_GATES` currently always lists `website`. Build the gates list dynamically: include `"website"` only when `accountKind === "activity"`. Stays see the original 5-step checklist; activity operators see 6.
- Leave the `gateCopy` `"website"` case in place.

**3. `src/lib/price-match.scan.functions.ts`**
- Only look up `business_website_url` and derive `operator_site_host` when the deal's category is an activity (`do` or `tour`). For stays, pass `operator_site_host: null` (the field is already optional in `runDealPriceMatch`).
- Tiny optimization: also lets us skip the extra profile query for stays.

**4. `/business/onboarding/website` route**
- No changes. Page remains reachable by direct link, but it'll never be surfaced for stays because the gate won't appear in the checklist for them.

### Out of scope
- No DB migration. `business_website_url` column stays; it's just not enforced for stays.
- No copy changes on the website page itself (still accurate for activity operators who land there).