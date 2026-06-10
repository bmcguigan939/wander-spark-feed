## What's actually happening

The screenshot shows:
- **Generate iOS project** step → 1s, exited 0 (not red).
- **Install CocoaPods** step → failed, our guard `test -f ios/App/Podfile` fired with "Podfile missing — cap add ios failed earlier".

That combination means `./node_modules/.bin/cap add ios` ran, exited with status 0, and yet did NOT create `ios/App/Podfile`. The web-bundle heredoc indentation hint is a red herring here — YAML's `|` literal block strips the common indent (verified with `cat -A`), so the heredoc terminator does line up at column 0 in bash, and the previous step completed successfully (16s).

The real failure is silent: Capacitor 8's `cap add ios` exited cleanly but never produced the iOS template. We can't see why because the step's output isn't captured loudly, and our guard runs in the NEXT step instead of immediately after the offending command.

## Fix plan (edits to `codemagic.yaml` only)

### 1. Generate iOS project — make it fail at the source
Replace the iOS generation script with one that:
- Keeps `set -euo pipefail` and the `dist/mobile/index.html` preflight.
- Adds `set -x` so every command is echoed to the build log.
- Runs `bunx --bun cap --version` first to confirm the CLI resolves (replaces `./node_modules/.bin/cap` which depends on the bin symlink existing).
- Uses `bunx --bun cap add ios` and `bunx --bun cap sync ios` instead of the `.bin` path.
- Immediately after `cap add ios`, asserts the template landed:
  `test -f ios/App/Podfile || { echo "cap add ios returned 0 but Podfile was not generated"; ls -laR ios || true; exit 1; }`
- Keeps the stale-folder cleanup (`rm -rf ios` when Podfile is missing).
- Ends with `ls -la ios/App` for visibility.

### 2. Generate Android project — same hardening
- Add `set -x`.
- Switch to `bunx --bun cap add android` / `bunx --bun cap sync android`.
- After `cap add android`, assert `test -f android/app/build.gradle` (Capacitor 8 puts `build.gradle` under `android/app/` as well as the root) and fail loudly with `ls -laR android` if missing.

### 3. Install CocoaPods — keep the existing guard
Already prints "Podfile missing — cap add ios failed earlier" and exits 1. With the changes in step 1, this should no longer be the first failure we see — the iOS step itself will turn red with the real reason.

### 4. No other changes
- `capacitor.config.ts`, `package.json`, and the web build are correct.
- `@capacitor/cli@^8.4.0` is in devDependencies and present in `bun.lock`.
- `.gitignore` does not track `ios/` or `android/`, so each fresh CI run starts from a clean state — no cache-collision fix needed.

## Technical details (for reference)

- `cap add ios` copies a template from `node_modules/@capacitor/ios/ios-template/` into `ios/App/`. If that copy is interrupted or skipped, the CLI can still exit 0 in some failure modes. `set -x` plus the immediate Podfile assertion will surface exactly which case we hit.
- `bunx --bun cap` resolves the CLI via Bun's runner rather than relying on `node_modules/.bin/cap`, which avoids a class of "binary symlink missing after frozen-lockfile install" issues.

## Expected result after the fix

- If `cap add ios` truly fails, the **Generate iOS project** step turns red with the actual `set -x` trace and a `ls -laR ios` dump — no more misleading "CocoaPods failed" symptom.
- If `cap add ios` succeeds, `ios/App/Podfile` is asserted to exist before the next step, so **Install CocoaPods** can run normally.
- Same behavior for Android.
