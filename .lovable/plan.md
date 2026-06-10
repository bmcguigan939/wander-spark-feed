## The real error

Codemagic step "Generate iOS project" fails with:

```
error: could not determine executable to run for package cap
```

`bunx cap ...` tries to download an npm package literally named `cap` (which doesn't exist). The Capacitor CLI binary is `cap`, but it ships inside `@capacitor/cli`. And right now **no Capacitor packages are in `package.json`** — that's why nothing resolves.

## Fix

1. **Add Capacitor as devDependencies** in `package.json` so they install with `bun install`:
   - `@capacitor/cli`
   - `@capacitor/core`
   - `@capacitor/ios`
   - `@capacitor/android`

   Install locally so the lockfile updates (this is what makes `bun install --frozen-lockfile` succeed on Codemagic).

2. **Update `codemagic.yaml`** to call the local binary instead of `bunx cap`:
   - Replace `"$HOME/.bun/bin/bunx" cap add ios` → `./node_modules/.bin/cap add ios`
   - Replace `"$HOME/.bun/bin/bunx" cap sync ios` → `./node_modules/.bin/cap sync ios`
   - Same for Android.

   This bypasses bunx's "treat first arg as a package name" behavior and runs the real Capacitor CLI installed in `node_modules`.

3. Leave `capacitor.config.ts`, the `dist/mobile/index.html` shell, and the Bun PATH fixes unchanged — they're already correct.

## After implementation

Push to GitHub (auto-syncs), then start a fresh Codemagic build with **Clear cache** ON.