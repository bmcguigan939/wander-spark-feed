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
1. Push the repo to GitHub/GitLab/Bitbucket.
2. Connect it on codemagic.io.
3. Open the `ios-build` workflow. Before running, in Codemagic settings:
   - Add your Apple Developer signing certificate + provisioning profile (or use Codemagic's automatic code signing with your Apple Developer account).
   - Uncomment the `ios_signing` block in `codemagic.yaml` (currently commented out for unsigned dry-runs).
4. Click **Start new build → ios-build**. Wait ~20 minutes.
5. Download the `Travidz.ipa` artifact when the build completes.

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