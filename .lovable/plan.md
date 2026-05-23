## Goal

Build a colourful, Gen-Z-styled marketing landing page at `/` for logged-out visitors (so Google traffic searching "Travidz" lands here), with the core message: **sign up and start earning from your travel videos**. Signed-in users keep getting the feed exactly as today.

## Behaviour

- `/` checks auth state on render.
  - Signed-in → existing `FeedPage` (unchanged).
  - Signed-out → new `LandingPage`.
- All existing `/` search params (`?v=...` shared video) still route signed-in users to the feed; signed-out users see the landing page regardless (we can add a "sign up to watch" hint later if needed — out of scope here).

## New landing page sections (top → bottom)

1. **Sticky top bar** — Travidz wordmark left, "Log in" + bright "Sign up & earn" buttons right.
2. **Hero** — Bold display headline: *"Post your travel videos. Get paid when people book."* Sub: short Gen-Z friendly explainer (11% commission, no follower minimums). Primary CTA: **Sign up & start earning** → `/login?mode=signup`. Secondary: *"Just here to explore"* → `/login`. Animated colourful gradient background using existing `--sunset`, `--coral`, `--twilight` tokens, soft blobs + grain.
3. **Social proof strip** — "Built for creators on TikTok, Reels & Shorts" with platform icons; founding-creator badge ("First 100 creators get lifetime perks") pulling live count from existing `getFoundingSpotsRemaining` serverFn.
4. **How it works** — 3 colourful cards: *Post a video → Tag the spot → Earn 11%* when someone books through your link. Each card uses a different accent token.
5. **For creators vs for travellers** — Two-column split with playful illustrations using emoji + gradients (no new image assets to start).
6. **Feature highlights grid** — 4 bento-style tiles: real bookings, calendar sync for businesses, map-pin discovery, instant payouts.
7. **FAQ accordion** — 5 questions (cost, payout, eligibility, content rules, supported countries). Uses existing shadcn Accordion.
8. **Final CTA band** — Big gradient block, repeat "Sign up & start earning" button.
9. **Footer** — Links to `/login`, `/business`, `/legal/terms`, `/legal/privacy`, social handles placeholder.

## Design direction (matches existing brand)

- Reuse tokens: `--background` cream, `--foreground` twilight ink, accents `--sunset`, `--coral`, `--twilight`, plus `--primary`. No new colours added.
- Display font already in `--font-display`; body in `--font-sans`. Larger, punchier type scale than the app (hero ~ `clamp(2.75rem, 7vw, 5.5rem)`).
- Generous rounded corners (`rounded-3xl`), soft shadows, subtle grain, animated gradient blobs (CSS only, no new deps).
- Motion: light entrance fade/slide using existing `framer-motion` (already in deps — confirm in implementation; if missing, fall back to CSS transitions, no new install).
- Fully responsive; mobile-first since target audience is mobile-heavy.

## SEO

Per-route `head()` on `/`:
- title: *"Travidz — Post travel videos, get paid when people book"*
- description (<160 chars): creator-earning pitch + 11% commission.
- og:title, og:description, og:url `https://www.travidz.com/`, og:type `website`.
- Canonical `https://www.travidz.com/` (leaf — fine).
- JSON-LD: `Organization` + `WebSite` with `potentialAction` SearchAction.
- Single H1 = hero headline.

Note: signed-in users render the feed under the same URL, so the SEO `head()` still applies to both — that's fine; crawlers see the landing copy.

## Files

- **New**: `src/components/landing/LandingPage.tsx` (the marketing page + sub-components inline or in a small `landing/` folder if it grows).
- **Edit**: `src/routes/index.tsx` — wrap return so signed-out users render `<LandingPage />` and signed-in users render the existing `<FeedPage />` body. Move `head()` to the landing copy. Keep all current feed logic intact.
- **No DB / serverFn changes** beyond reusing `getFoundingSpotsRemaining`.

## Out of scope

- New illustration / hero image generation (can add later; ask before generating).
- A/B testing infra, analytics events beyond what's already wired.
- Translations.
- Rewriting `/welcome`, `/login`, or the business landing.