## Bug

`Build IPA` fails with:
```
xcode-project build-ipa: error: argument --workspace: Path "ios/App/App.xcworkspace" does not exist
```

Capacitor 8's iOS template no longer generates an `.xcworkspace` (that was the CocoaPods layout). It only generates `ios/App/App.xcodeproj`. The previous fix removed the CocoaPods step but left the Build IPA step pointing at the workspace.

## Fix (single edit to `codemagic.yaml`)

### 1. Build IPA — use `--project` instead of `--workspace`
Replace:
```yaml
- name: Build IPA
  script: |
    xcode-project build-ipa \
      --workspace "$XCODE_WORKSPACE" \
      --scheme "$XCODE_SCHEME"
```
with:
```yaml
- name: Build IPA
  script: |
    xcode-project build-ipa \
      --project "$XCODE_PROJECT" \
      --scheme "$XCODE_SCHEME"
```

### 2. Update the env var
In `environment.vars`, replace:
```
XCODE_WORKSPACE: "ios/App/App.xcworkspace"
```
with:
```
XCODE_PROJECT: "ios/App/App.xcodeproj"
```

No other changes. Android workflow is unaffected.

## Expected result
`Build IPA` finds `ios/App/App.xcodeproj`, archives via SPM, and produces the signed `.ipa`.
