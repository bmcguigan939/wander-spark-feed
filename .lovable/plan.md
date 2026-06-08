## Honest answer on the IPA first

You asked for either a TestFlight build or a signed `Travidz.ipa`. I have to be straight with you: **I cannot produce either from Lovable.** Apple requires the binary to be archived and signed on macOS using your Apple Developer certificates and provisioning profiles. Lovable's sandbox runs on Linux and has no Xcode, no Apple keychain, and no access to your developer account. There is no workaround — this is an Apple platform rule, not a Lovable limitation.

The signed IPA gets produced in exactly one of two places:
- **Codemagic** (already configured in `codemagic.yaml`) — runs on a cloud Mac, archives + signs, uploads to TestFlight. You click "Start build" on codemagic.io.
- **Your own Mac** with Xcode — open the generated `ios/App/App.xcworkspace`, Product → Archive → Distribute App.

Everything else in your request I can deliver. The plan below covers it.

---

## 1. Fix Universal Links — use your Team ID

Replace `TEAMID` in `public/.well-known/apple-app-site-association` with `L784LR8VY6`, so both entries become `L784LR8VY6.com.travidz.app`. This makes iOS recognise travidz.com links and open them in the app once installed.

## 2. Confirm Universal app (iPhone + iPad)

Update `public/appstore/metadata.md` to declare iPhone + iPad. No code change needed in `capacitor.config.ts` — Capacitor builds universal by default; Xcode just needs the iPad target ticked when archiving (it is by default).

## 3. Generate the reviewer test account

Create `scripts/seed-apple-reviewer.ts` that uses the service-role key to:
- Create `apple-review@travidz.com` with a strong generated password
- Pre-confirm the email
- Seed: 1 saved collection, 1 in-progress itinerary, 1 confirmed booking in Stripe test mode

Run it once (one psql migration plus an insert) so the account exists in production. Write the generated password into `public/appstore/reviewer-notes.md` and `/mnt/documents/appstore/reviewer-notes.md`.

Proposed password format: `Travidz-Review-2026!{8-char-random}` — easy for a reviewer to type, hard to guess.

## 4. App Store screenshots — iPhone 6.5" and iPad 12.9"

I will write a Playwright script (`scripts/capture-appstore-screenshots.ts`) that:
- Boots the preview at the right viewport (1290×2796 for iPhone 6.5", 2048×2732 for iPad 12.9")
- Signs in as a seeded demo user with realistic content
- Captures 5 iPhone frames: Feed, Deal detail, Map, Creator profile, Checkout
- Captures 5 iPad frames: same screens, iPad layout
- Saves PNGs to `public/appstore/screenshots/iphone-6.5/` and `public/appstore/screenshots/ipad-12.9/`, mirrored to `/mnt/documents/appstore/screenshots/`

**Important caveat Apple will care about:** screenshots captured from a web preview are *web Chrome with a forced viewport*, not real iOS chrome. Apple sometimes rejects these for "non-device chrome / status bar mismatch". The safest first submission is to install the TestFlight build on an iPhone + iPad and screenshot from the device (5 seconds per screen). I will still generate the web-preview set as a usable fallback, but I will mark them as "draft / replace with on-device captures if possible" in the README.

## 5. Update the README and metadata

- `public/appstore/README.md` — record the Team ID, mark iPad screenshots as required, note manual upload via Transporter (since you are not wiring the App Store Connect API key yet), add Transporter step-by-step.
- `public/appstore/metadata.md` — flip Devices to "iPhone, iPad" and the iPad screenshot row from `[ ]` to `[x]`.
- `public/appstore/reviewer-notes.md` — fill in the generated password and confirm Universal app.

## 6. Manual Transporter upload — instructions added to README

The first-release path without an API key:
1. Codemagic `ios-build` workflow produces `Travidz.ipa` as an artifact — download it.
2. Open **Transporter** (free, App Store).
3. Sign in with your Apple ID.
4. Drag `Travidz.ipa` in → Deliver.
5. Wait ~10 minutes; the build appears in App Store Connect → TestFlight.
6. From there: attach screenshots, paste metadata, paste reviewer credentials, Submit for Review.

---

## What I need from you to proceed

Nothing — you've given me everything to execute. Approve and I'll switch to build mode and ship items 1–6.

## Technical notes (skip if not interested)
- Playwright is already a dev dependency pattern in the project (used in other scripts). The capture script runs against the live preview URL via puppeteer-style flow but does not need a Mac.
- The seed script will use `supabaseAdmin` from `src/integrations/supabase/client.server.ts`, executed as a one-off `bun run scripts/seed-apple-reviewer.ts` from the sandbox.
- AASA does not need a redeploy of native; iOS refetches it. But you'll only see it work after the first TestFlight install.
