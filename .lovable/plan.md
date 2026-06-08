## Goal

Wire `codemagic.yaml` for **automatic iOS signing** and leave App Store Connect publishing as a **placeholder** (manual Transporter upload for v1.0, easy to flip on later). Then answer the "can Lovable do everything?" question with the honest split.

## Changes

### 1. `codemagic.yaml` — iOS workflow

- Uncomment `ios_signing` and set:
  ```yaml
  ios_signing:
    distribution_type: app_store
    bundle_identifier: com.travidz.app
  ```
  This uses Codemagic's **automatic** signing (managed by App Store Connect API integration). No `.p12` / provisioning profile juggling.
- Uncomment the `xcode-project use-profiles` step so the build picks up the fetched profiles.
- Change the IPA build step: remove `CODE_SIGNING_ALLOWED=NO` and the trailing `|| true` so a signing failure actually fails the build.
- Leave the `publishing.app_store_connect` block commented with a clear `# TODO: enable after adding App Store Connect API key` header, plus the two-line snippet ready to uncomment:
  ```yaml
  # publishing:
  #   app_store_connect:
  #     auth: integration
  #     submit_to_testflight: true
  ```

### 2. `codemagic.yaml` — Android workflow

- Leave `android_signing` block commented with a `# TODO` note. (You haven't given me a keystore yet; out of scope for this turn.)

### 3. `public/appstore/README.md`

Add a new top section **"Codemagic setup (one-time, ~10 min)"** with the exact clicks:

1. Sign in to codemagic.io with GitHub → add this repo.
2. **Teams → Integrations → Apple Developer Portal** → connect with Apple ID `L784LR8VY6`. This is what `ios_signing: distribution_type: app_store` reads.
3. Open the `ios-build` workflow → **Start new build** → pick `main` branch → Start.
4. When it finishes (~15 min), download `Travidz.ipa` from the Artifacts tab.
5. Open **Transporter** (free, Mac App Store) → sign in with your Apple ID → drag the IPA → Deliver.
6. ~10 min later, the build appears in App Store Connect → attach to v1.0 → submit.

Plus a **"Later: skip Transporter"** subsection explaining that adding an App Store Connect API key + uncommenting the `publishing` block makes future builds auto-land in TestFlight.

## What Lovable can and cannot do — honest split

**I (Lovable) can do, and will do this turn:**
- ✅ Write `codemagic.yaml` correctly
- ✅ Write the seed script for the Apple reviewer account
- ✅ Write the Playwright screenshot script (web-preview draft quality)
- ✅ Write all App Store Connect metadata text
- ✅ Update the README with exact click-by-click instructions

**I cannot do — requires you on a Mac or in a browser:**
- ❌ Run Codemagic — needs you to click "Start build" in codemagic.io
- ❌ Produce a signed `.ipa` — Apple signing requires macOS + your Apple Developer cert; only Codemagic (cloud Mac) or your own Mac can do it
- ❌ Upload to App Store Connect — Transporter is a Mac app
- ❌ Take real on-device screenshots — Apple may reject web-preview frames as "non-device chrome"; ideally captured in Xcode Simulator
- ❌ Run the reviewer-seed script against prod — needs the prod service-role key, which lives on your machine, not in this sandbox

## Out of scope (ask if you want them)

- Android signing block (need a keystore from you first)
- App Store Connect API key integration (you said no API key for v1.0)
- Real on-device screenshot capture (needs Xcode Simulator on a Mac)
