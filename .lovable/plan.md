## Update `codemagic.yaml` to use existing key name

Your Apple Developer Portal key in Codemagic is saved as **`Codemagic`**, but the workflow currently expects a key named `APP_STORE_CONNECT_KEY`. Update the workflow to reference the actual name.

### Change

In `codemagic.yaml`, inside the `ios-build` workflow:

```yaml
integrations:
  app_store_connect: Codemagic   # was: APP_STORE_CONNECT_KEY
```

Also update the surrounding comments to reflect the current key name.

### After approval

1. Push to GitHub → rerun the `ios-build` workflow in Codemagic.
2. On success, Codemagic uploads the IPA to App Store Connect.
3. Apple processes the build (~10–30 min) → it appears under TestFlight and in the App Store version's **Build** section, ready to submit for review.

No other files change. Android workflow untouched.