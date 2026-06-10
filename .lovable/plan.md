## What's actually happening

The "Generate iOS project" step is red, but the log shows `cap add ios` actually succeeded — it produced the full Capacitor 8 iOS template:

```
ios/App/CapApp-SPM/
  Package.swift
  Sources/CapApp-SPM/CapApp-SPM.swift
ios/capacitor-cordova-ios-plugins/
  CordovaPluginsResources.podspec
```

That is the **Swift Package Manager** layout. Capacitor 7+ switched iOS plugin management from CocoaPods to SPM. There is no `ios/App/Podfile` anymore — and there shouldn't be. Our assertion `test -f ios/App/Podfile` therefore fires after a perfectly successful `cap add ios`, killing the step with the misleading "Podfile was not generated" message.

The next step ("Install CocoaPods") would also fail for the same reason — Capacitor 8 doesn't use Pods.

## Fix plan (edits to `codemagic.yaml` only)

### 1. Generate iOS project — assert the SPM artifact, not Podfile
Replace `test -f ios/App/Podfile` with the real Capacitor 8 marker:
```
test -f ios/App/CapApp-SPM/Package.swift || { echo "cap add ios did not generate SPM package"; ls -laR ios || true; exit 1; }
```
Same change in the "stale folder" check — replace `[ ! -f "ios/App/Podfile" ]` with `[ ! -f "ios/App/CapApp-SPM/Package.swift" ]`.

### 2. Drop the "Install CocoaPods" step entirely
Capacitor 8 resolves plugins via SPM during `xcodebuild`. `pod install` is not needed and `ios/App/Podfile` will never exist. Remove the whole step.

### 3. Build IPA step — point at the right workspace
Capacitor 8 still generates `ios/App/App.xcworkspace`, so `XCODE_WORKSPACE` stays the same. No change needed there — but verify by adding `ls ios/App` already present at the end of the generate step.

### 4. Android — no change required
The Android assertion (`test -f android/app/build.gradle`) is still correct for Capacitor 8.

## Expected result

- "Generate iOS project" turns green (it was already doing the right work).
- No more "Install CocoaPods" step to fail.
- Build proceeds to "Set up code signing" → "Build IPA".
