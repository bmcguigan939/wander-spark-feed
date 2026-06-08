# Travidz App Store deployment pack

Everything in this folder is what you paste / upload into App Store Connect.

## Key facts
- **Apple Team ID:** `L784LR8VY6` (already wired into `public/.well-known/apple-app-site-association`)
- **Bundle ID:** `com.travidz.app`
- **Platform:** Universal app — iPhone + iPad
- **Reviewer login:** `apple-review@travidz.com` / `Travidz-Review-2026!LiR3ZKhb`
- **Distribution:** Manual upload via Apple Transporter for v1.0 (no App Store Connect API key wired yet)

## What's here
- `AppIcon-1024.png` — 1024×1024 flat PNG, ready for App Store Connect.
- `metadata.md` — every text field for the App Store page.
- `privacy-nutrition.md` — answers for Apple's App Privacy questionnaire.
- `reviewer-notes.md` — credentials + notes for the App Review team.
- `monetisation.md` — explains why Travidz uses Stripe instead of Apple IAP.
- `screenshots/iphone-6.5/` — draft iPhone 6.5" screenshots (1290×2796)
- `screenshots/ipad-12.9/` — draft iPad 12.9" screenshots (2048×2732)

## What's NOT here (and why)
- **The signed `.ipa` build.** Apple requires the binary to be built and signed on macOS with your Apple Developer account. Lovable's sandbox is Linux-only — it cannot produce or sign iOS binaries. Run the `ios-build` workflow on Codemagic (config in `codemagic.yaml`) or open the project in Xcode on a Mac. The pipeline is already wired with `com.travidz.app` and the right Capacitor settings.
- **Final on-device screenshots.** The PNGs in `screenshots/` are *draft* captures from the web preview at the correct iOS viewport sizes. Apple sometimes rejects web-preview screenshots for "non-device chrome / status bar mismatch". The safer path is to install the TestFlight build on a real iPhone + iPad and capture from the device (5 seconds per screen). Use the drafts as fallback if that's not possible for v1.0.

## Recommended order

### Step 0 — Codemagic setup (one-time, ~10 min)

1. Sign in to [codemagic.io](https://codemagic.io) with GitHub → add this repo.
2. **Teams → Integrations → Developer Portal** → connect your Apple Developer account (Team `L784LR8VY6`). This is what `ios_signing: distribution_type: app_store` in `codemagic.yaml` reads — Codemagic will auto-create / fetch the distribution certificate and provisioning profile for `com.travidz.app`.
3. (Optional, later) **Teams → Integrations → App Store Connect** → add an API key. Once added, uncomment the `publishing.app_store_connect` block in `codemagic.yaml` and every future build auto-uploads to TestFlight — no Transporter needed.

### Step 1 — Seed the reviewer account (one-off)
```bash
SUPABASE_URL=<prod url> \
SUPABASE_SERVICE_ROLE_KEY=<service role key> \
bun run scripts/seed-apple-reviewer.ts
```

### Step 2 — (Optional) regenerate draft screenshots
```bash
bun add -d playwright
bunx playwright install chromium
PREVIEW_URL=https://www.travidz.com bun run scripts/capture-appstore-screenshots.ts
```
Outputs `public/appstore/screenshots/iphone-6.5/*.png` and `…/ipad-12.9/*.png`.

### Step 3 — Build the IPA on a Mac (Codemagic OR local Xcode)

**Option A — Codemagic (recommended, no Mac needed):**
1. Make sure Step 0 is done (Apple Developer Portal integration connected).
2. Open the `ios-build` workflow → **Start new build** → pick `main` branch → **Start**.
3. Wait ~15–20 minutes. Automatic signing fetches the cert + profile and produces a signed IPA.
4. Download `Travidz.ipa` from the **Artifacts** tab.

**Option B — Local Xcode (if you have a Mac):**
```bash
bun install
bun run build
bunx cap add ios       # first run only
bunx cap sync ios
cd ios/App && pod install && open App.xcworkspace
```
In Xcode: select **Any iOS Device** → **Product → Archive** → **Distribute App → App Store Connect → Export**. Save the IPA.

### Step 4 — Upload the IPA via Apple Transporter
1. Install **Transporter** (free, Mac App Store).
2. Sign in with the Apple ID that owns Team `L784LR8VY6`.
3. Drag `Travidz.ipa` into the window.
4. Click **Deliver**.
5. Wait ~10 minutes — the build appears in App Store Connect → TestFlight → iOS Builds, status "Processing" then "Ready to Submit".

> **Later: skip Transporter entirely.** Add an App Store Connect API key to Codemagic (Step 0.3) and uncomment the `publishing.app_store_connect` block in `codemagic.yaml`. Every future `ios-build` then auto-uploads to TestFlight and Steps 4 disappear.

### Step 5 — App Store Connect form
1. **App Information** — paste from `metadata.md`.
2. **Pricing & Availability** — Free, all territories.
3. **iOS App 1.0**:
   - Upload `AppIcon-1024.png`.
   - Upload screenshots from `screenshots/iphone-6.5/` and `screenshots/ipad-12.9/` (or device captures).
   - Paste Promotional Text, Description, Keywords, URLs, What's New, Copyright from `metadata.md`.
   - Select the build that just appeared from TestFlight.
4. **App Privacy** — fill the questionnaire using `privacy-nutrition.md`.
5. **App Review Information** — paste reviewer credentials + notes from `reviewer-notes.md`. Tick "Sign-in required".
6. **Version Release** — Manual release recommended for v1.0.
7. Click **Add for Review → Submit for Review**.

Apple's first review typically takes 24–48 hours.