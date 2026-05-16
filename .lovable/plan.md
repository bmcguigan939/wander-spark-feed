# Execution plan — Smoke test → Phase 5 close → Hardening

## Step 1 — Smoke test (you drive, I react)

Only you can do this part: I can't sign in as a second user in your live project. The fastest pass:

1. Open the published/preview URL in an incognito window, sign up as a second account (call it Account B).
2. From Account B, run through this checklist and tell me what breaks. I'll fix each issue as a follow-up.

Checklist (in order — each depends on the prior):

- **Follow** — visit `/u/<your-first-account-username>`, tap Follow, refresh, confirm the count bumps and the button shows "Following".
- **Following feed** — go to `/`, switch to the Following tab, confirm Account A's video shows up.
- **Like + comment** — like Account A's video, open comments, post a top-level comment, reply to it, delete your own comment.
- **Notifications (Account A side)** — switch back to Account A's window, confirm the bell badge incremented in realtime and `/notifications` lists the follow + like + comment + reply.
- **Business analytics** — as Account B, scroll past the video with the matched deal a few times, then tap the deal pill once. As Account A, open `/business/deals/<id>` and confirm impressions, clicks, CTR, unique clickers, and the funnel bar all moved.
- **AI re-tag** — as Account A on `/profile`, tap the AI pill on your video, wait, refresh, confirm tags repopulate.

Report back any "this didn't update / button did nothing / empty view / error toast" — I'll patch each one. Don't proceed to step 2 until this is clean (or you've told me what to ignore).

## Step 2 — Close gap #1 (transactional emails + role picker)

Two independent pieces.

### 2a. Email notifications

Recommendation: use **Lovable Emails** (built-in), not Resend. Reasons:
- No separate API key, no DNS records to babysit, no extra connector to wire.
- Same templating model (React Email), same queue/retry safety we'd want from Resend.
- Resend has a hard conflict with Lovable Emails on the same subdomain — picking Resend now locks future auth-email work off that path.

If you have a strong reason to use Resend specifically (e.g. you already use it elsewhere and want one provider), say so and I'll switch.

Triggers to wire on first pass:
1. **Business application submitted** → email to the business contact: "We received your application, we'll review within X days."
2. **Business application approved** (when an admin grants the `business` role) → "You're approved, here's how to create your first deal" with a deep link to `/business`.
3. **First click on a deal** → email to the business owner: "Your deal '<title>' just got its first click."

All three are 1:1, event-triggered, recipient expects them → safely transactional.

Out of scope here (would be marketing, not allowed on transactional infra): weekly performance digests, "creators near you" blasts. We can do those later via in-app cards.

Plumbing:
- Confirm/configure an email sender domain (one-time setup dialog if not done yet).
- Scaffold transactional email infrastructure (queue, suppression, unsubscribe page).
- Create three React Email templates: `business-application-received`, `business-application-approved`, `deal-first-click`.
- Fire `sendTransactionalEmail` from the existing serverFns at the right moments (apply submit, role grant, first row inserted into `deal_clicks` for a given deal — handled with a Postgres trigger that calls a serverFn-equivalent route, OR a check inside the existing click logger).
- Build a small `/unsubscribe` page to honor the system-managed footer.

### 2b. First-run role picker

- New `/onboarding` route, guarded so it only renders when the user has only the default `traveller` role AND has never dismissed it.
- 3 large cards: **Traveller** (default, just keep browsing), **Creator** (publish videos), **Business** (run deals — routes into existing `/business/apply` flow).
- Picking Creator grants the `creator` role immediately via a server fn that uses `supabaseAdmin` (RLS on `user_roles` blocks self-insert by design).
- Picking Business routes to `/business/apply` and does not auto-grant — admin still approves.
- Redirect new signups to `/onboarding` from the root route's `beforeLoad` when the user is authenticated and only has `traveller`. Add a "Skip for now" link that sets a profile flag (`onboarded_at`) so we don't pester them.
- One small migration: add `onboarded_at timestamptz` to `profiles`.

## Step 3 — Harden

Strictly post-step-2. Three independent items, can be done in one pass.

### 3a. Feed pagination
- Current: `listFeed` fetches 20 and stops.
- Change `listFeed` to keyset-paginate on `(created_at desc, id desc)` and accept a `cursor` param.
- Wrap the feed route in `useInfiniteQuery`; trigger next page when the user is within ~3 cards of the end (IntersectionObserver on a sentinel).
- Same treatment for the Following tab and `/u/:username` grid (page size 24 there).

### 3b. Creator video management
- On the creator's own profile grid, each video gets a "…" menu:
  - **Edit** — sheet to update title, description, destination/city/country, activity_tags (chips), budget_tag. Reuses existing `updateVideo` patterns; nothing exotic.
  - **Delete** — confirm dialog, calls a serverFn that deletes the `videos` row (cascades clean up likes/saves/comments/collection_items because of the FKs we have today — verify before shipping; add `ON DELETE CASCADE` where missing).
  - **Re-run AI tagging** — already exists, keep it in the menu instead of as a floating pill.

### 3c. Empty states
- `/search` — distinct copy for "no query yet" vs "no results for X" with a couple of suggested tag chips.
- `/collections` — illustration + "Save a video to start a collection" CTA linking to `/`.
- `/notifications` — already has one, tighten copy.
- Creator profile with zero videos — "Upload your first video" CTA linking to `/create`.
- Business with zero deals — "Create your first deal" CTA linking to `/business/deals/new`.

## Sequencing & sign-off

```text
Step 1 (you, ~15 min)        → report breakages
   ↓
fix anything reported        → (only if needed)
   ↓
Step 2a Emails  +  Step 2b Onboarding   ← can be one turn each
   ↓
Step 3 Harden (single turn covering 3a/3b/3c)
```

Reply with:
- "smoke clean" once you've finished step 1 with no findings (or a list of what broke), and
- "use Resend" only if you want to override the Lovable Emails recommendation in step 2a.

Then I'll start on step 2.
