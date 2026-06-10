/**
 * Capacitor config — used when wrapping the web app into native iOS / Android
 * shells for App Store + Google Play submission.
 *
 * This file alone is harmless on the web build. To generate native projects:
 *   bun add -d @capacitor/cli
 *   bun add @capacitor/core @capacitor/ios @capacitor/android
 *   bunx cap init Travidz com.travidz.app --web-dir=dist
 *   bunx cap add ios
 *   bunx cap add android
 *
 * Those `cap add` commands require Xcode (macOS) or Android Studio locally,
 * OR Codemagic's cloud builders (see codemagic.yaml). They are intentionally
 * NOT run from this sandbox.
 */
// Note: we don't `import type { CapacitorConfig } from "@capacitor/cli"`
// because @capacitor/cli isn't installed in the web project — it gets added
// later when generating the native projects on a Mac or Codemagic builder.
// The Capacitor CLI reads this file as a plain JS module at native build
// time, so a typed object literal is sufficient.
const config = {
  appId: "com.travidz.app",
  appName: "Travidz",
  webDir: "dist/mobile",
  server: {
    // The bundled webDir is a tiny shell that redirects to the live site.
    // `url` makes the WebView load the live Travidz site directly so the
    // native app always serves the latest SSR build.
    url: "https://www.travidz.com",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0F172A",
  },
  android: {
    backgroundColor: "#0F172A",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0F172A",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0F172A",
      overlaysWebView: false,
    },
    App: {
      // Universal Links / App Links are served from
      // public/.well-known/apple-app-site-association and assetlinks.json
    },
  },
};

export default config;