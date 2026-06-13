# Add explicit completion actions to onboarding steps

Today every gate in **Enable bookings on Travidz** turns green only when the backend detects the underlying state (3+ photos, an active room, Stripe onboarded, etc.). That works, but on agreement and content pages there's no clear "I'm done" button, so users don't feel they've ticked the box. We'll add explicit Accept / Save CTAs in the right places and ensure each one flips its checklist row to green immediately.

## What changes (user-visible)

### 1. Agreement pages — Accept button at the bottom
On `/legal/business-agreement` and `/legal/creator-agreement`, add a sticky footer bar showing:
- Status pill ("Not accepted" / "Accepted on <date>")
- Primary button: **"I agree & accept"** (or **"Already accepted"** disabled, when applicable)
- Secondary link: Back to dashboard

On click → calls existing `acceptAgreement({ kind })` → toast → status flips → returning to `/business` shows the **Accept business agreement** row already ticked green.

The small `AgreementBanner` on the dashboard stays (quick path), but the page itself now also has the explicit CTA the user asked for.

### 2. Onboarding checklist — explicit "Done" confirmation per gate
The checklist gates (photos, rooms/options, payouts, auto-accept rules, website) currently auto-tick from backend signals. We'll keep the auto-detection **and** add visible confirmation so the user knows it registered:
- When a gate's underlying condition becomes true, the row already turns green with a "Done" badge — no change needed there.
- For gates the user might think they finished but haven't crossed the threshold (e.g. uploaded 2 photos, not 3), the row shows a small **"Needs 1 more photo"** hint under the title instead of just "Open". (Pulled from existing `bookable` data; no new backend.)
- On each gate target page (`/business/photos`, `/business/deals/$id`, `/business/onboarding/payout`, `/business/collabs`), add a clear green confirmation banner at the top once that gate is satisfied: *"✓ This step is complete — back to setup"* with a Back link.

### 3. Wizard steps — "Mark step complete" button where it's missing
Some wizard steps in `/business/setup` advance only via implicit save. We'll audit and ensure every step has a visible primary button at the bottom (Continue / Save & continue / Skip) — none should leave the user wondering whether the step counted. Steps that already have this stay as-is.

## Technical details

**Files edited (no new backend, no migration):**
- `src/routes/legal.business-agreement.tsx`, `src/routes/legal.creator-agreement.tsx` — add a sticky `AgreementAcceptBar` footer (new small component in `src/components/legal/AgreementAcceptBar.tsx`) that reuses `getMyAgreementStatus` + `acceptAgreement` from `verification.functions.ts`.
- `src/components/layout/LegalPage.tsx` — add optional `footer` slot to host the accept bar.
- `src/components/business/OnboardingChecklist.tsx` — when a gate is incomplete but partially done, show a short progress hint (e.g. `${count}/3 photos`) using data already in `bookable.missing` / counts; replace plain "Open" with contextual labels ("Add 1 more photo", "Connect bank", etc.).
- `src/routes/business.photos.tsx`, `src/routes/business.onboarding.payout.tsx`, `src/routes/business.collabs.tsx`, `src/routes/business.deals.$id.tsx` — add a small `<StepCompleteBanner />` (new in `src/components/business/StepCompleteBanner.tsx`) that renders when the gate is satisfied and links back to `/business`.
- `src/routes/business.setup.tsx` — sweep step renderers; any step missing an explicit footer CTA gets a "Save & continue" button wired to its existing save fn.

**No DB changes.** Acceptance timestamps already live on `profiles.business_agreement_accepted_at` / `creator_agreement_accepted_at`; photo/room/payout state is already what the checklist reads.

**Cache invalidation:** existing `queryClient.invalidateQueries(["agreement-status"])` and `["bookable-status"]` calls already flip the dashboard rows green on the next render.

## Out of scope
- No changes to commission, payouts, RLS, or `bookable.functions.ts` logic.
- No re-design of the legal page typography.
- No new "manually mark complete" override for gates that have a real backend threshold — auto-detection stays the source of truth (prevents false-green rows).