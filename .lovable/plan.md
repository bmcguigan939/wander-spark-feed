# Confirming the flow, then making it visibly one-tap

## What the code does today (your question first)

Short answer: **almost yes, but not quite one-tap yet.**

What actually happens when a second (or third, or tenth) creator sends a Travidz collab request to a business that's already set up:

1. The creator fills the "Invite a business" sheet on their video (`TagBusinessSheet.tsx`), which calls `createBusinessInvite`. This always creates a **new** `business_invites` row tied to that video + that creator.
2. The business gets an email and a unique invite link `/business/invite/{token}`.
3. The landing page (`src/routes/business.invite.$token.tsx`) shows:
   - the offer copy ("X% commission, no setup fee, no monthly cost…"),
   - a **Travidz Business Agreement** checkbox they must tick,
   - then the **"Accept & claim your listing"** button.
4. Accepting calls `acceptInvite`, which creates a fresh `deal` row pointing at their site, auto-approves a `deal_application` so the creator earns commission, attaches the deal to that creator's matching videos, and writes a row to `business_agreement_acceptances`.

So functionally the business doesn't have to set anything up again — no new payout details, no new pages, the same Travidz-hosted store keeps serving — but **the UI still shows them the full offer + legal checkbox every time**, which makes it feel like onboarding all over again. There is also no copy anywhere that tells a first-time business "after this, future creators are one-tap."

## What to change

### 1. Make the repeat-invite landing actually one-tap

In `src/routes/business.invite.$token.tsx` (and a small read helper in `business-invites.functions.ts`):

- Extend `getInviteByToken` (or add a sibling fn) to also return:
  - `isReturningBusiness: boolean` — true if the signed-in user (or the invite email) already has at least one `business_agreement_acceptances` row.
  - `priorAcceptedInvites: number` — count of prior accepted invites by this business email.
- When `isReturningBusiness` is true on the landing page:
  - Replace the "The offer" block with a compact **"Welcome back — {creatorName} wants to feature you"** card.
  - Hide the agreement checkbox (still record a new `business_agreement_acceptances` row server-side so the audit trail stays complete), and skip the `agreed` gate in `handleAcceptClick`.
  - Rename the CTA to **"Accept — add {creatorName} to your creators"**.
  - Add a one-line reassurance: *"No new setup. Your booking page, payouts and Best Price Guarantee carry over."*
- Keep the full agreement + offer copy exactly as it is today for first-time businesses.

### 2. Tell first-time businesses this on the very first invite

Also in the landing page (first-time path) and in the outreach email body builder (`fallbackInviteDraft` in `src/lib/outreach.functions.ts`, plus the AI prompt's `instructions` string just above it):

- Add a short "What happens after you accept" section to the landing page, just under the offer card:
  > **One setup, then it's just a tap.** Once you accept, any other Travidz creator who features your business can be added with a single tap from your dashboard — no new forms, no new payout details, no new agreement.
  >
  > **More creators = more global reach.** Every additional creator you accept puts your listing in front of their audience, in their language, in the cities they travel to. There's no cap and no extra cost — you still only pay commission on bookings we send you.
- Mirror the same two ideas (one short paragraph each) into the AI outreach prompt and the fallback email template so the message lands before the business even clicks the link.

### 3. Surface incoming creator requests in the business dashboard

So returning businesses don't have to dig through email to find new creator requests:

- On `src/routes/business.index.tsx`, add a "Creators waiting on you" strip that lists `business_invites` where `contact_email = current user's email` AND `status = 'pending'`. Each row has the creator name + video thumb + a single **Accept** button that hits `acceptInvite` inline (no redirect to the token page needed when they're already signed in as that business).
- Same accept call as the landing page, so all the existing deal-creation / commission-application logic is reused — nothing new server-side beyond the read in step 1.

## Out of scope

- The separate `deal_applications` / auto-accept-rules system in `collabs.functions.ts` (that's for creators applying to an existing public deal, not for direct invites). No changes there.
- Any change to commission %, payout flow, or the agreement itself.
- Email template visual redesign — copy edits only.

## Files touched

- `src/routes/business.invite.$token.tsx` — returning-business branch, copy additions.
- `src/lib/business-invites.functions.ts` — extend `getInviteByToken` return shape, drop the agreement-checkbox requirement server-side when the business already has a prior acceptance (still record a new row), add a small `listPendingInvitesForCurrentBusiness` fn.
- `src/lib/outreach.functions.ts` — extend AI prompt + `fallbackInviteDraft` copy.
- `src/routes/business.index.tsx` — "Creators waiting on you" strip.

No DB migrations needed (we reuse `business_agreement_acceptances` and `business_invites`).
