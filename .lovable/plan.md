## Goal

In the "Smart deals for this video" → "Send collaboration contract" form:
1. Make the **website optional** — creators can move forward without it (email stays required).
2. Add a **review step** before the contract goes out, so the creator can read and edit the outreach email before sending.

## Changes

### 1. DB migration — make website_url nullable

`business_invites.website_url` is currently `NOT NULL`. Migration: `ALTER TABLE public.business_invites ALTER COLUMN website_url DROP NOT NULL;`

### 2. `src/lib/business-invites.functions.ts`

- `createInput`: change `websiteUrl: z.string().url().max(500)` to `websiteUrl: z.union([z.string().url().max(500), z.literal("")]).optional().nullable()`.
- Handler: store `null` when missing/empty; only normalize URL when present.
- `acceptInvite` handler: when creating the `deal` row from an invite that has no website, fall back to a sensible value (e.g. skip `url` if the column is nullable, or use the creator's profile/video link). Plan to set `url` to `null` if `deals.url` is nullable; otherwise we'll leave the website required at accept time and only validate-then-edit on the business landing page. Confirm `deals.url` nullability inside the implementation step and adapt.

### 3. `src/components/create/SmartDealsSheet.tsx` — `InviteForm`

Convert the inline form into a two-step panel:

**Step 1 — Details**
- Email becomes **required** (already required today — keep).
- Website becomes **optional**: placeholder "Website (optional)", and the `valid` check drops the website requirement (`valid = name.trim() && /.+@.+\..+/.test(email)`).
- Primary button: **"Review contract email"** (was "Send contract"). Disabled while invalid.

**Step 2 — Review**
- On clicking "Review contract email": call `createBusinessInvite` (which now accepts a null website), then call `draftInviteEmail` (already exists in `src/lib/outreach.functions.ts`) for that invite id, then switch to step 2.
- Show editable `subject` and `body` textareas prefilled by the draft.
- Buttons:
  - **Back** — return to step 1 keeping entered data.
  - **Regenerate** — re-runs `draftInviteEmail` for the same invite id.
  - **Copy email** — copies `subject\n\nbody`.
  - **Send contract** (primary) — opens `mailto:${email}?subject=…&body=…`, then calls `markSuggestionConverted` and `onSent()`. The contract is delivered via the creator's own inbox so replies land with them, matching the existing TagBusinessSheet pattern.
- Helper text: "We drafted this with your audience stats and links. Edit anything before it goes out."

### 4. Small copy tweak

Update the footer line under the form to "Email is required. Website is optional — the business can add theirs when they accept."

## Out of scope

- No changes to the AI extractor or suggestion schema.
- No changes to `TagBusinessSheet` (separate entry point, already has a review step).
- No changes to the business-side `/business/invite/:token` landing flow beyond the optional `website_url` handling in `acceptInvite`.
