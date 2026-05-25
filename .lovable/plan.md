Build the full native shell now so Travidz is store-ready the day your Apple/Google accounts and company registration clear. Until then, the existing PWA install flow is the only download path on travidz.com — no APK hosting.

App identity (default, change anytime): **Travidz** · `com.travidz.app` · "Travel inspiration in motion"

---

## What can be built now (zero developer accounts needed)

Capacitor wraps your existing web app into a native iOS + Android project on disk. No signing, no upload, no Apple/Google login required to write the code and run a debug build. Signing certificates and store uploads are the only steps that need the developer accounts — those wait.

---

## Phase 1 — Capacitor native shell

- Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
- `capacitor.config.ts` — appId `com.travidz.app`, name "Travidz", webDir = build output, dark splash `#0F172A`
- Generate `ios/` and `android/` project folders (committed to repo)
- Plugins: `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/haptics`, `@capacitor/share`, `@capacitor/app`, `@capacitor/browser`, `@capacitor/preferences`
- `src/lib/native.ts` — thin wrapper exposing `isNative()`, `haptic()`, `share()`, `openExternal()`. PWA users get no-op fallbacks so nothing breaks on web
- Status bar: dark background, light icons (matches your theme tokens)
- Universal Links / App Links files: `public/.well-known/apple-app-site-association` + `public/.well-known/assetlinks.json` (need bundle ID — fine to publish now, devices ignore them until app is installed)

## Phase 2 — Wire native UX into existing components

- `VideoCard.tsx` — call `haptic('light')` on like/save tap (native only); web behaviour unchanged
- External links (deal CTAs, business profile links) — route through `Browser.open()` for in-app Safari View Controller / Custom Tabs when native
- `PWAInstallPrompt.tsx` — early-return when `isNative()` (it's redundant inside the app)
- Deep link handler in `src/start.ts` — `travidz.com/v/:id` and `travidz://v/:id` route to the right video
- `src/routes/__root.tsx` — `viewport-fit=cover` already set; add safe-area padding tokens for notch/home-indicator

## Phase 3 — OneSignal push notifications

- Install `onesignal-cordova-plugin` (Capacitor-compatible)
- Initialise on app launch (native only); permission prompt fires after the user scrolls the feed twice (better opt-in than at startup)
- New table `push_subscriptions` (user_id, onesignal_player_id, platform, created_at) with RLS — users see only their own
- `src/lib/push.functions.ts` server fn `sendPush(userId, title, body, deepLink)` → OneSignal REST API
- Notification triggers: new follower, deal expiring 1h, video reply, weekly digest
- Notification preference toggles in `/settings` (4 switches, persisted per user)
- Requires `ONESIGNAL_APP_ID` + `ONESIGNAL_REST_API_KEY` secrets — I'll request these via `add_secret` once you create the OneSignal app (free, 5 minutes)

## Phase 4 — Store-required pages & flows

- `/legal/privacy` and `/legal/terms` already exist — review and add Capacitor/OneSignal disclosures
- `/support` — review existing route; Apple requires a reachable support URL
- `/account/delete` — Apple requirement since June 2022; cascading delete via server fn (videos, comments, likes, saves, follows, collections, push subs)
- Age gate at signup (13+) — quick checkbox + DOB collection

## Phase 5 — Store assets

- 1024×1024 icon master (Travidz "T" mark on `#3B82F6 → #0F172A` gradient, generated)
- iOS icon set + Android adaptive icon (foreground/background layers) — auto-sized via `@capacitor/assets`
- Splash screens, all sizes
- 6 store screenshots per platform (iPhone 6.7", iPhone 5.5", iPad 12.9", Android phone) — captured from preview, framed with marketing captions, saved to `/mnt/documents/store-assets/`
- App Store + Play Store listing copy drafts: title, subtitle, description (4000 char), keywords (100 char), promo text (170 char)

## Phase 6 — /download landing page (live on travidz.com today)

- New route `/download` with platform detection:
  - **iPhone/iPad** → "Add Travidz to your Home Screen" → opens existing iOS install instructions sheet
  - **Android** → "Add Travidz to your Home Screen" → triggers `beforeinstallprompt` (same flow as existing `PWAInstallPrompt`, but explicit button)
  - **Desktop** → "Open on your phone" with a QR code that points to `travidz.com/download`
- Placeholder cards for "Coming soon to App Store" + "Coming soon to Google Play" with email capture (notify me on launch) → writes to a new `launch_waitlist` table
- Once stores approve, swap placeholders for real App Store / Play Store badges (one-line edit)
- Add a "Get the app" link to the landing page header

## Phase 7 — Codemagic cloud build (set up now, no Mac needed)

- `codemagic.yaml` at repo root with two workflows:
  - `ios-build`: bun install → vite build → `npx cap sync ios` → Xcode build → IPA artifact
  - `android-build`: bun install → vite build → `npx cap sync android` → gradle assembleRelease → AAB artifact
- Manual trigger only (no auto-deploy on push)
- Codemagic free tier covers your first 500 build minutes/month
- Builds run successfully now without signing; once Apple/Google accounts are live you add the certs in Codemagic UI (one-time) and upload to stores

---

## Files created / modified

**New**
- `capacitor.config.ts`, `codemagic.yaml`, `ios/`, `android/`
- `src/lib/native.ts`, `src/lib/push.functions.ts`
- `src/routes/download.tsx`, `src/routes/account.delete.tsx`
- `src/components/NotificationPermissionPrompt.tsx`, `src/components/QRCode.tsx`
- `public/.well-known/apple-app-site-association`, `public/.well-known/assetlinks.json`
- `src/assets/icon-1024.png`, splash assets
- SQL migration: `push_subscriptions`, `launch_waitlist`, account-deletion server fn

**Modified**
- `src/main.tsx` / `src/start.ts` (Capacitor init + deep-link handler)
- `src/components/feed/VideoCard.tsx` (native haptics on tap)
- `src/components/PWAInstallPrompt.tsx` (skip when native)
- `src/routes/settings.tsx` (notification toggles, "Install app" entry, legal links, "Delete account")
- `src/components/landing/LandingPage.tsx` ("Get the app" CTA)
- `package.json` (Capacitor + OneSignal deps)

---

## What you'll do later (when accounts ready)

1. Apple Developer ($99/yr) → in Codemagic click "Fetch signing files" → automatic
2. Google Play ($25 one-time) → upload first AAB manually to create the listing, then automated
3. OneSignal app (free) → paste App ID + REST API Key (I'll request via `add_secret`)
4. Paste my drafted store listing copy + upload generated screenshots
5. Submit for review — Apple 1–3 days, Google < 1 day

Once approved: swap `/download` placeholders for real store badges (one PR, 5 minutes).

---

## Out of scope (flag if you want any)

- In-app purchases (would trigger 15–30% commission — not needed for booking/affiliate model)
- Sign in with Apple (only required if you add Google sign-in to iOS — you don't have it yet)
- Sentry crash reporting + PostHog analytics (recommended but not blocking)
- Localization beyond English

Confirm app identity (`Travidz` / `com.travidz.app`) or adjust, then I'll execute Phases 1–7 in build mode.
