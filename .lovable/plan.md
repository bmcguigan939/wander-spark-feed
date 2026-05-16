# Creator → Business Onboarding Flow

Let creators tag businesses featured in their videos and send them a one-click invite to join Travidz at a flat **5% commission on sales directed through their listing**. Internally, that 5% is split 2.5% creator / 2.5% platform — the business only ever sees the flat 5%.

## User flow

**Creator side** (`/studio/videos/$id`)
1. New "Businesses featured in this video" panel under the insights tiles.
2. "Tag a business" button opens a sheet:
   - Search existing Travidz businesses → attach instantly.
   - Or "Add new business": name, direct website URL, city, contact email (required), optional phone.
3. Submitting creates a `business_invites` row, generates a token, and queues the email.
4. Panel shows status per invite: `pending · sent`, `accepted`, `declined`, `expired`, with resend / revoke.

**Business side** (`/business/invite/$token` — public)
- Hero: "{Creator} featured {Business} in a Travidz video."
- Video preview + creator stats (followers, views on this video).
- The offer (single, flat):
  > "{Creator} would like to advertise your direct website on Travidz for a **5% commission fee on any sales directed through them**. No setup fee, no monthly cost — you only pay when we send you a paying customer."
- Two CTAs:
  - **Accept & claim your listing** → magic-link signup → auto-assigns `business` role → auto-creates a deal pointing at the business's direct website → auto-approves a `deal_application` at 5% → attaches the deal to the video.
  - **Decline** (optional reason) or **Reply to creator**.

## Data model

New table `business_invites`:
- `video_id`, `creator_id`, `business_name`, `website_url`, `city`, `contact_email`, `contact_phone`
- `existing_business_id` (nullable — for tagging an already-onboarded business)
- `token` (unique), `status` (`pending | accepted | declined | expired`), `expires_at` (now() + 30d)
- `commission_pct` 5.00, `creator_share_pct` 2.50, `platform_share_pct` 2.50 (defaults, locked)
- `accepted_business_id`, `accepted_deal_id`, `decline_reason`

RLS: creator can CRUD own invites; anyone with the token can read (public landing); accepted business can read their accepted invite.

## Server functions (`src/lib/business-invites.functions.ts`)

- `createBusinessInvite({ videoId, businessName, websiteUrl, city, email, phone })` — auth as creator, validates ownership of video, generates token, inserts row, enqueues email via existing transactional email infra.
- `listInvitesForVideo({ videoId })` — creator view.
- `listMyInvites()` — all invites by current creator.
- `getInviteByToken({ token })` — public read (returns video preview + creator profile + offer terms).
- `acceptInvite({ token, email })` — issues magic link, on first sign-in auto-creates business + deal + pre-approved application at 5%.
- `declineInvite({ token, reason? })`.
- `revokeInvite({ inviteId })` / `resendInvite({ inviteId })` — creator only.

Commission constants live in one place: `src/lib/commission.ts` exports `COMMISSION = { totalPct: 5, creatorPct: 2.5, platformPct: 2.5 }`. All copy and DB defaults read from here.

## UI files

- `src/routes/studio.videos.$id.tsx` — add "Businesses featured" panel + open sheet.
- `src/components/studio/TagBusinessSheet.tsx` — search existing + add-new form.
- `src/routes/business.invite.$token.tsx` — public landing page (no auth required).
- `src/lib/email-templates/business-invite.tsx` — React Email template with the 5% copy (no platform split mentioned to business).

## Email copy (business-facing)

Subject: `{Creator} wants to feature your business on Travidz`

Body highlights:
- "{Creator} just featured **{Business}** in a Travidz video that's already getting views."
- "They'd like to advertise your direct website on our platform for a **5% commission fee on any sales directed through them**."
- "No setup fee. No monthly cost. You only pay when we send you a paying customer."
- Single CTA: **Accept & claim your listing** → `/business/invite/{token}`.
- Secondary: "Not interested? Decline in one click."

## Out of scope (next iterations)

- Stripe Connect / actual payout wiring of the 2.5/2.5 split.
- Bulk-tagging multiple businesses at once.
- AI auto-detection of business mentions from video transcripts (planned as follow-up — would feed this flow automatically).
- SMS / WhatsApp delivery — email only for v1.

## Open question

Should the 5% (and 2.5/2.5 split) stay as a hard-coded constant in `src/lib/commission.ts`, or be stored in a `platform_settings` table so admins can tune it later without a code change? Default to constant for v1 unless you say otherwise.
