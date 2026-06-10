## What's happening

"Generate iOS project" took only ~1s and is marked successful, but the next step ("Install CocoaPods") fails with `No 'Podfile' found in the project directory`. That means `cap add ios` either didn't run or exited without actually generating the iOS project — and our script didn't catch the failure.

Two likely causes:
1. The `if [ ! -d "ios" ]` guard found a stale (empty) `ios/` directory from a cached build, so `cap add ios` was skipped and `cap sync ios` did nothing.
2. `cap add ios` failed silently because the script doesn't use `set -e`.

## Fix (codemagic.yaml only)

Rewrite the "Generate iOS project" and "Generate Android project" steps to:
- Use `set -euo pipefail` so any failure aborts the step loudly.
- Guard on the actual generated marker file (`ios/App/Podfile` / `android/build.gradle`), not just the directory.
- If the marker is missing, wipe the stale platform folder and re-run `cap add`.
- Always run `cap sync` after.
- Print a sanity `ls` so logs show whether the Podfile was actually created.

Also tighten "Install CocoaPods" to `set -e` and fail loudly if `ios/App/Podfile` is missing.

No other files change. After approval: push to GitHub, rerun Codemagic with **Clear cache** ON.