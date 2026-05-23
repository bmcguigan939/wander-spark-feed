## Goal
Make creator → business outreach a first-class, one-tap step right after upload (and on any existing video), with an AI-drafted email that pitches Travidz using the creator's social proof.

## Where it lives today
- `TagBusinessSheet` already collects business name / website / city / contact email, calls `createBusinessInvite`, and generates an invite token.
- `draftInviteEmail` (Lovable AI Gateway) already produces a `{subject, body}` and is currently only reachable from `studio.videos.$id` AFTER the invite has been created (small "AI draft" pill that opens `mailto:`).
- The post-upload screen (`create.tsx`) shows `ShareToSocialsCard` and a "Smart deals" entry — but **no** "Invite the business" entry.

The infra is there; the path to use it isn't.

## Plan

### 1. Post-upload "Invite a business" CTA (`src/routes/create.tsx`)
In the `ShareToSocialsCard` block shown after `publishedVideoId` is set, add a prominent secondary card / button: **"Did you feature a business? Invite them →"**. Tapping opens the existing `TagBusinessSheet` pre-filled with `city` / `destination` already entered in the upload form. Keeps the rest of the post-upload flow untouched.

### 2. Studio video card quick action (`src/routes/studio.videos.tsx`)
Add a small "Invite business" action on each video row (alongside the existing actions menu) that opens `TagBusinessSheet` for that video. Surfaces it for videos that were already uploaded before this feature shipped.

### 3. Upgrade `TagBusinessSheet` to a 2-step flow
- **Step 1 — Details** (unchanged form).
- **Step 2 — Review email** (new): after `createBusinessInvite` succeeds, automatically call `draftInviteEmail`, show the AI subject + body in editable textareas, with:
  - `Copy email` button
  - `Open in mail app` (mailto: with edited subject/body, prefilled `to:`)
  - `Copy invite link` (existing token URL)
  - `Regenerate` (re-calls `draftInviteEmail`)
This replaces the current "create invite then hunt for the AI draft pill on the insights page" flow.

### 4. Strengthen the AI prompt with creator social proof (`src/lib/outreach.functions.ts`)
`draftInviteEmail` currently passes creator display name + video stats. Extend it to also pull:
- The creator's `follower_count` from `profiles` (if present)
- Aggregate `views`/`likes` across their last ~10 published videos (one cheap query on `videos`)
- Their `cross_links` on this video (Instagram / TikTok / YouTube handles) so the AI can mention reach across platforms
- A branch in the system prompt: **if total reach ≥ a small threshold**, lead with audience-size pitch; **else**, lead with content-quality / authentic storytelling pitch and a "let's grow together" angle.
No schema changes — all data already exists.

### 5. Tiny polish
- After invite creation, keep the existing "mark suggestion converted" wiring intact.
- Toast "Invite ready — review the email" instead of the current "share the link with them".

## Files touched
- `src/routes/create.tsx` — add post-upload "Invite a business" entry
- `src/routes/studio.videos.tsx` — add per-video "Invite business" action
- `src/components/studio/TagBusinessSheet.tsx` — add Step 2 (review/edit/send AI email)
- `src/lib/outreach.functions.ts` — enrich prompt with follower count / cross-platform reach / adaptive tone

## Out of scope
- Sending the email directly from Travidz servers (would need a verified domain + suppression handling). The mailto:/copy flow uses the creator's own inbox so the business replies to them directly — which is what you want for a first conversation.
- Tracking email opens.

If you want me to also wire **server-side sending via Lovable Emails** (so the creator can hit "Send" inside Travidz instead of opening their mail app), say the word and I'll add it as a follow-up — that needs an email domain set up first.
