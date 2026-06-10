## Problem

Codemagic build fails at **Install CocoaPods** with `No 'Podfile' found in the project directory`. Two root causes:

1. **Build web bundle step exits silently wrong / produces wrong dist shape.** Your Vite build outputs to `dist/client/` (SSR build). The hand-rolled `index.html` rewrite is fragile and unnecessary — Vite already emits a correct `dist/client/index.html`. We just need to flatten `dist/client` → `dist` so Capacitor's `webDir: "dist"` finds it.
2. **`cap add ios` likely didn't actually scaffold `ios/App/`** (so no Podfile exists when `pod install` runs). This happens when Capacitor packages are added mid-build with `--frozen-lockfile` semantics, or when the web bundle path is wrong so cap silently skips. Capacitor deps should live in `package.json`, not be added during the build.
3. **`cd ios/App` is wrong for the workspace path you're already declaring** — when Capacitor scaffolds, the Podfile is at `ios/App/Podfile`, but we should guard against missing dir and fail loudly.

## Fix

- Replace the "Build web bundle" step with the simple flatten approach.
- Remove the "Install Capacitor packages" step (they must be in `package.json`).
- Guard `pod install` with a clear error if the Podfile didn't get scaffolded.
- Verify `capacitor.config.ts` has `webDir: "dist"` (it already does).

### Action items (build mode)
1. Add `@capacitor/core`, `@capacitor/ios`, `@capacitor/cli` to `package.json` dependencies so `bun install --frozen-lockfile` resolves them.
2. Replace `codemagic.yaml` with the version below.

### Corrected `codemagic.yaml`

```yaml
workflows:
  ios-build:
    name: Travidz iOS
    instance_type: mac_mini_m2
    max_build_duration: 60

    environment:
      vars:
        BUNDLE_ID: "com.travidz.app"
        XCODE_WORKSPACE: "ios/App/App.xcworkspace"
        XCODE_SCHEME: "App"
      node: 22
      xcode: latest
      cocoapods: default
      ios_signing:
        distribution_type: app_store
        bundle_identifier: com.travidz.app

    triggering:
      events: []

    scripts:
      - name: Install Bun
        script: |
          curl -fsSL https://bun.sh/install | bash
          export PATH="$HOME/.bun/bin:$PATH"
          echo 'export PATH="$HOME/.bun/bin:$PATH"' >> $CM_ENV

      - name: Install dependencies
        script: |
          export PATH="$HOME/.bun/bin:$PATH"
          bun install --frozen-lockfile

      - name: Build web bundle
        script: |
          export PATH="$HOME/.bun/bin:$PATH"
          bun run build
          if [ -d "dist/client" ]; then
            mv dist dist-ssr
            mv dist-ssr/client dist
            rm -rf dist-ssr
          fi
          test -f dist/index.html || { echo "No dist/index.html after build"; find . -maxdepth 3 -type d; exit 1; }

      - name: Generate iOS project
        script: |
          export PATH="$HOME/.bun/bin:$PATH"
          if [ ! -d "ios/App" ]; then
            bunx cap add ios
          fi
          bunx cap sync ios
          test -f ios/App/Podfile || { echo "Podfile missing after cap sync"; ls -la ios/App || true; exit 1; }

      - name: Install CocoaPods
        script: |
          cd ios/App
          pod install --repo-update

      - name: Set up code signing
        script: |
          xcode-project use-profiles

      - name: Build IPA
        script: |
          xcode-project build-ipa \
            --workspace "$XCODE_WORKSPACE" \
            --scheme "$XCODE_SCHEME"

    artifacts:
      - build/ios/ipa/*.ipa
      - $HOME/Library/Developer/Xcode/DerivedData/**/Build/**/*.app
```

Switch to build mode and I'll apply the YAML + add Capacitor packages to `package.json`.
