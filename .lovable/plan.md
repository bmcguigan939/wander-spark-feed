The current Codemagic failure is different from the earlier `dist/index.html` issue. It now fails at **Install dependencies** with `bun: command not found`, which means Bun is installed in one step but not available in the next step’s shell.

Plan:

1. Update `codemagic.yaml` so every step that uses Bun first loads the Bun path reliably.
   - Keep the `Install bun` step.
   - Change later commands from plain `bun` / `bunx` to `$HOME/.bun/bin/bun` and `$HOME/.bun/bin/bunx`, or add the Bun path inside each script block.
   - This avoids relying on `$CM_ENV`, which is not carrying the PATH into the next step on your Codemagic machine.

2. Keep the previous mobile bundle fix intact.
   - Preserve the `dist/mobile/index.html` creation.
   - Keep `capacitor.config.ts` pointing to `dist/mobile` and `https://www.travidz.com`.

3. After implementation, you should start a fresh Codemagic build with **Clear cache** enabled.
   - This ensures Codemagic checks out the latest GitHub version of `codemagic.yaml` and does not reuse the stale failing command.

Technical change preview:

```yaml
- name: Install dependencies
  script: |
    export PATH="$HOME/.bun/bin:$PATH"
    "$HOME/.bun/bin/bun" install --frozen-lockfile

- name: Build web bundle
  script: |
    export PATH="$HOME/.bun/bin:$PATH"
    "$HOME/.bun/bin/bun" run build
    ...

- name: Generate iOS project (first run only)
  script: |
    export PATH="$HOME/.bun/bin:$PATH"
    if [ ! -d "ios" ]; then
      "$HOME/.bun/bin/bunx" cap add ios
    fi
    "$HOME/.bun/bin/bunx" cap sync ios
```

Once you approve, I’ll apply this directly to `codemagic.yaml`.