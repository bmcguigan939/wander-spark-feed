Now that the project is published and `notify.travidz.com` is verified, here's what's next.

## Smoke test (you do this — Step 1 is live)

Run through these on the published URL. Tell me which (if any) fail.

1. Sign out → sign up new email → see `/welcome` → pick **Creator** → land on `/create`.
2. Sign out → sign up again → pick **Traveller** → land on `/` → reload → no `/welcome` again.
3. Sign out → sign up again → pick **Business** → land on `/business/apply`.
4. On `/login` click **Forgot password?** → toast appears, recovery email arrives.
5. Open the recovery link → set a new password on `/reset-password` → redirected to `/login` → sign in works.

## What I'll do next (in this order)

### A. Branded auth emails (finishes Step 1)
Domain is verified, so I'll:
1. Scaffold the six auth email templates (signup confirm, magic link, recovery, invite, email-change, reauthentication) with Travidz styling — Compass mark, primary color from `src/styles.css`, white body, dark accents.
2. Re-run the email infra setup so the pg_cron dispatcher is registered against the published `process-email-queue` route (the route is now deployed, so cron can activate).
3. You verify by triggering a signup or forgot-password and confirming the email arrives from `notify@travidz.com` with Travidz branding (check Cloud → Emails for queue status).

### B. Step 2 — Business onboarding + deals CRUD
Most of this is already scaffolded (`business.apply.tsx`, `business.index.tsx`, `business.deals.*` routes, `DealForm.tsx`, `deals` table with proper RLS). I'll audit and finish:
- Image upload to the existing `deal-images` bucket from `DealForm` (currently it's a URL field).
- Empty/loading/error states on the business dashboard.
- Active vs inactive toggle + delete confirm on the deal detail page.
- Public `/deals` index + `/deals/$id` polish, click tracking already wired via `deal_clicks`.

Smoke test for Step 2 (we'll run after I build):
1. As a Business user, create a deal with image upload → appears on `/deals` and `/business`.
2. Edit the deal, toggle inactive → disappears from public `/deals`, still visible in `/business`.
3. Click "Open deal" from public `/deals/$id` → `deal_clicks` row inserted, `click_count` bumps.
4. Delete the deal → confirm dialog → gone everywhere.

### Roadmap after Step 2

3. Creator analytics on `/profile` (views, likes, saves per video).
4. Notifications: mark-all-read + realtime badge.
5. Collections polish (cover image, reorder, share link).
6. Search: filters (country, activity tag, budget) on `/search`.
7. AI tagging post-Mux-webhook (auto activity_tags + transcript summary via Lovable AI).
8. AI itinerary builder on a destination page.
9. Map view of saved/feed videos.
10. Creator storefront page.
11. Stripe Connect deal payouts (last — biggest scope).

Reply with smoke-test results (or just "go") and I'll start on A.