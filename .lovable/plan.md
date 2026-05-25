## Goal
The landing page badge ("Only X founding creator spots left") is driven by how many `profiles` rows already have a `founding_creator_number`. Right now 10 test accounts hold spots #1–#10, so the counter shows 490 left. We want it back to a clean 500/500 for launch.

## Approach
Run a single migration that clears the founding flags on every existing profile:

- Set `founding_creator_number = NULL`
- Set `is_founding_creator = false`
- Leave `creator_joined_at` and `power_tier_locked_at` untouched (those affect commission grandfathering, not the public counter)

After this, `getFoundingSpotsRemaining` will return `{ remaining: 500, cap: 500 }` and the next 500 real signups will be auto-numbered #1–#500 by the existing trigger.

## Out of scope
- No changes to the trigger logic, cap value, landing copy, or commission tiers.
- Not deleting the test user accounts themselves — only releasing their founding spot.
- If you'd rather also wipe the test accounts entirely, say the word and I'll add that to the migration.

## Technical detail
One migration:
```sql
UPDATE public.profiles
SET founding_creator_number = NULL,
    is_founding_creator = false
WHERE founding_creator_number IS NOT NULL
   OR is_founding_creator = true;
```
