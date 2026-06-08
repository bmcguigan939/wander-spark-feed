# Travidz App Store deployment pack

Everything in this folder is what you paste / upload into App Store Connect.

## What's here
- `AppIcon-1024.png` — 1024×1024 flat PNG, ready for App Store Connect.
- `metadata.md` — every text field for the App Store page.
- `privacy-nutrition.md` — answers for Apple's App Privacy questionnaire.
- `reviewer-notes.md` — credentials + notes for the App Review team.
- `monetisation.md` — explains why Travidz uses Stripe instead of Apple IAP.

## What's NOT here (and why)
- **The signed `.ipa` build.** Apple requires the binary to be built and signed on macOS with your Apple Developer account. Lovable's sandbox is Linux-only — it cannot produce or sign iOS binaries. Run the `ios-build` workflow on Codemagic (config in `codemagic.yaml`) or open the project in Xcode on a Mac. The pipeline is already wired with `com.travidz.app` and the right Capacitor settings.
- **Screenshots.** Best captured on a real iPhone (or the Xcode iPhone simulator at 1290×2796) once the IPA is installed — that way every system bar, status icon, and font is exactly what Apple expects. Generating them from the web preview tends to be rejected for "non-device chrome".

## Recommended order
1. Run Codemagic `ios-build` → it uploads to TestFlight.
2. Install the TestFlight build on an iPhone, open it, and capture 5 screenshots at the system level.
3. Upload screenshots in App Store Connect.
4. Paste the text from `metadata.md`.
5. Fill App Privacy from `privacy-nutrition.md`.
6. Paste `reviewer-notes.md` into App Review Information.
7. Run `bun run scripts/seed-apple-reviewer.ts` against the production DB to create the reviewer account (or do it from the admin panel).
8. Submit for Review.
