## Important reality check first

Lovable's sandbox is a Linux web build environment — it **cannot produce a signed iOS `.ipa` or run Xcode**. Apple requires the binary to be built and signed on macOS with your Apple Developer account credentials. The good news: the project is already wired for this. `capacitor.config.ts` (bundle id `com.travidz.app`) and `codemagic.yaml` (Mac M2 build pipeline) are in place. The actual archive + TestFlight upload runs on **Codemagic's cloud Mac builders** (or your own Mac with Xcode), using your Apple Developer credentials.

So this plan splits the work into:
- **What I can deliver from Lovable** (everything except the signed binary)
- **What you / Codemagic must do on a Mac** (the build + upload itself)

---

## 1. App Store assets I will generate

Saved into `public/appstore/` and `/mnt/documents/appstore/` so you can drag them straight into App Store Connect.

- **App icon 1024×1024 PNG** — flat, no transparency, no rounded corners (Apple rejects those). Generated from the existing Travidz orange→pink→purple gradient.
- **iPhone 6.5" screenshots (1290×2796)** — 5 frames: feed, deal detail, map, creator profile, checkout. Captured via a headless script that renders the live preview and crops with the right safe areas.
- **iPad 12.9" screenshots (2048×2732)** — 3 frames (only if you want iPad submission; otherwise we declare iPhone-only).
- **App preview video** — skipped for v1.0 (optional, often delays review).

## 2. App Store metadata file

A single `appstore/metadata.md` containing copy you paste into each App Store Connect field:

- Promotional Text (≤170 chars) — your supplied line
- Subtitle (≤30 chars)
- Description (≤4000 chars)
- Keywords (≤100 chars, comma-separated)
- Support URL → `https://www.travidz.com/support`
- Marketing URL → `https://www.travidz.com`
- Privacy Policy URL → `https://www.travidz.com/legal/privacy`
- Copyright → `© 2026 Travidz Limited`
- Category: Travel (primary), Social Networking (secondary)
- Age rating questionnaire answers (UGC + location → 12+)

## 3. Apple Review information

- A dedicated reviewer test account seeded in the DB via a one-off seed script: `apple-review@travidz.com` / generated password, pre-verified, with sample saved deals and a sample booking so reviewers can exercise checkout in Stripe test mode.
- Reviewer notes covering: how to sign in, that bookings use Stripe test cards, that creator upload is gated behind `Become a creator`, and that all video content is moderated.

## 4. Privacy questionnaire answers

A `appstore/privacy-nutrition.md` with the exact Apple "Data Used to Track You / Linked to You / Not Linked to You" answers based on what the code actually collects: email, name, photos (uploaded videos), coarse location (map search), purchase history, device id (analytics), crash data. No third-party tracking SDKs detected, so "Used to Track You" = none.

## 5. Monetisation note (important for Apple)

Apple's rule: **physical goods/services** (a hotel night, a tour) are billed through Stripe — Apple takes no cut. **Digital content unlocked inside the app** (e.g. a paid subscription to premium creator features) must go through Apple IAP. The plan declares Travidz as a real-world travel marketplace (Stripe-only, no IAP), which is the same model Airbnb and Booking.com use. The metadata doc spells this out for the reviewer so they don't flag Guideline 3.1.1.

## 6. Build pipeline activation

Edit `codemagic.yaml` to:
- Uncomment the `ios_signing` and `app_store_connect` publishing blocks
- Wire it to the App Store Connect API key (you create the key in App Store Connect → Users and Access → Integrations, then add it to Codemagic as an integration)
- Flip the trigger so a Lovable publish optionally kicks a TestFlight build

Once that's set, every Codemagic run produces a signed IPA and uploads it to TestFlight automatically.

## 7. PWA / Universal Links sanity check

`public/.well-known/apple-app-site-association` still has `TEAMID.com.travidz.app` placeholder. I'll replace `TEAMID` with your actual 10-character Apple Team ID (you'll need to give it to me — it's shown top-right of developer.apple.com).

---

## What I need from you to finish the pack

1. **Apple Team ID** (10-char, top-right of Apple Developer console) — to fix the AASA file.
2. **Confirm iPad support**: submit iPhone-only for v1.0, or include iPad screenshots?
3. **App Store Connect API key** (Issuer ID, Key ID, .p8) — to enable Codemagic → TestFlight auto-upload. If you'd rather upload the IPA manually via Transporter the first time, skip this.
4. **Reviewer test account password** — I'll generate one if you don't have a preference.

## What happens after you approve this plan

1. I generate the icon, screenshots, metadata, privacy doc, reviewer seed script, and update the AASA file.
2. You run the Codemagic `ios-build` workflow (one click on codemagic.io) — it produces the signed IPA and pushes it to TestFlight.
3. You paste the metadata into App Store Connect, attach the screenshots and icon, paste the reviewer credentials, and hit **Submit for Review**.

I cannot produce step 2's binary from inside Lovable — but everything else in your request will be ready in one batch.
