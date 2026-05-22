## What I can test end-to-end without you

I have two independent testing channels available right now:

### 1. Live browser automation against the preview
I can drive the real preview URL (`/`, `/login`, `/deals`, `/creator`, `/business`, `/admin`, etc.) using browser tools — clicking, typing, scrolling, taking screenshots, reading console + network logs. This catches anything a human smoke-tester would catch: blank pages, broken layouts, 500s, failed API calls, navigation regressions (like the legal "Back" button we just fixed).

### 2. Direct server-function + API probes
I can hit your server endpoints directly without a browser:
- Public routes: `/r/:code`, `/sitemap.xml`, `/robots.txt`, `/api/public/cron/*`, `/api/public/d/:id`, `/api/public/go/:id`
- Server functions via the invoke tool (feed, deals, redemptions, discovery, etc.)
- Read-only DB queries to verify writes landed correctly

### What I cannot test
- **Anything behind login** — the browser shares the preview's Supabase session, so I'd be testing as *no user*. I can test public surfaces fully, but Creator Studio, Business dashboard, Admin, redemptions, and checkout require you to be logged in (or for me to seed and sign in as a test user, which needs your OK because it writes to your DB).
- **External integrations that cost money or send real messages** — Mux uploads, real affiliate redirects to suppliers, outbound emails to real inboxes, Stripe/payment flows.
- **Mobile-only gestures** — pinch, complex drag, native share sheets.

## Proposed test pass (≈10–15 min, zero code changes)

**Public, no-auth surface — full pass**
1. `/` feed loads, videos play, no console errors
2. `/deals`, `/deals/:id`, `/destinations`, `/destinations/:country`, `/map`, `/search`, `/collections`, `/itineraries` all render
3. Legal pages (`/legal/terms`, `/privacy`, etc.) load AND the Back button returns to the previous page (regression check on today's fix)
4. `/u/:username` for a seeded creator
5. `/login` renders, Google button present, email form validates
6. `/sitemap.xml` and `/robots.txt` return valid content
7. A referral redirect `/r/:code` resolves to a supplier URL with affiliate wrapping
8. Cron endpoints respond (POST to `/api/public/cron/fx-refresh`, etc.) — verifies the server functions are reachable

**Auth-gated surface — verify guards only**
9. Hitting `/admin`, `/studio`, `/business`, `/creator` while logged out redirects to `/login` (no leakage)
10. `/_authenticated/*` loader doesn't 500 on the redirect path

**Server-function smoke**
11. Invoke a few read-only server functions (feed query, deal list, destinations) and confirm shapes match `types.ts`
12. Check `/admin/errors` table via DB query for any new `client_error_logs` after the test pass

**Output you'd get**
- A pass/fail table per route
- Screenshots of anything visually broken
- Console/network errors with stack traces
- A short list of "needs your manual login to verify" items (Creator upload, Business deal creation, redemption flow, admin moderation)

## Optional follow-on (~1–2 hours, requires your approval to write code)
Scaffold Playwright with a seeded test user so I (and CI) can cover the auth-gated paths end-to-end on every change. Out of scope for this pass unless you want it.

## Want me to run pass #1 now?
Say the word and I'll execute steps 1–12 above and report back with results + screenshots. No code changes, no DB writes beyond cron endpoints that are designed to be hit repeatedly.