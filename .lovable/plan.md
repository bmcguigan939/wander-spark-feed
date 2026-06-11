## Goal
You don't have a Mac, so let Codemagic upload the signed `App.ipa` straight to App Store Connect / TestFlight. After that, the build appears under your App Store submission's "Build" picker in ~10–30 min.

## What you do once (in the browser, no Mac needed)

### 1. Create an App Store Connect API key
App Store Connect → **Users and Access → Integrations → App Store Connect API**:
- Click **+**, name: `Codemagic`, access: **App Manager**.
- Download the `.p8` file (one-time download).
- Copy **Issuer ID** (top of page) and **Key ID** (next to the key).

### 2. Add the key to Codemagic
Codemagic → **Teams → Personal Account → Integrations → Developer Portal / App Store Connect**:
- Add new App Store Connect API key.
- Paste Issuer ID + Key ID, upload the `.p8`.
- **Reference name must be exactly:** `APP_STORE_CONNECT_KEY` (case-sensitive — matches the YAML).

## What I'll change in the repo

One edit to `codemagic.yaml`, in the `ios-build` workflow only. Replace the commented-out publishing block with a live one:

```yaml
integrations:
  app_store_connect: APP_STORE_CONNECT_KEY

publishing:
  app_store_connect:
    auth: integration
    submit_to_testflight: true
    # Optional — auto-distribute once Apple finishes processing:
    # beta_groups:
    #   - Internal
```

No other changes. Android workflow untouched.

## After it lands

1. Push to GitHub → rerun `ios-build` in Codemagic.
2. Build finishes → Codemagic uploads the IPA → email from Apple "Processing complete" in ~10–30 min.
3. App Store Connect → **TestFlight → Builds** shows the build.
4. On your App Store submission page, **Build** section becomes populated → **+ → pick build → Add for Review**.

## If Apple emails ITMS warnings
Common first-build warning: missing encryption declaration. Easy fix later — add `ITSAppUsesNonExemptEncryption=false` to `Info.plist`. Not blocking.

---

Switch to **build mode** and I'll apply the `codemagic.yaml` change. The API key setup in App Store Connect + Codemagic you'll need to do yourself (those are external UIs).
