/**
 * Thin runtime wrapper around Capacitor. Safe to import from any client
 * component — when running on the web (no Capacitor at runtime) every
 * helper falls back to a no-op or the Web API equivalent.
 *
 * We avoid importing `@capacitor/core` at the top level so that the web
 * bundle does not depend on a native-only package. Instead we read the
 * `Capacitor` global that the native shell injects into the WebView.
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => "ios" | "android" | "web";
};

function cap(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null;
}

export function isNative(): boolean {
  return !!cap()?.isNativePlatform?.();
}

export function nativePlatform(): "ios" | "android" | "web" {
  return cap()?.getPlatform?.() ?? "web";
}

/**
 * Trigger a haptic tap. On web this is a no-op; on iOS/Android it calls the
 * native Haptics plugin via dynamic import so the web bundle stays clean.
 */
export async function haptic(style: "light" | "medium" | "heavy" = "light"): Promise<void> {
  if (!isNative()) return;
  try {
    const mod = await import(/* @vite-ignore */ "@capacitor/haptics");
    const ImpactStyle = (mod as any).ImpactStyle;
    await (mod as any).Haptics.impact({
      style: ImpactStyle?.[style.charAt(0).toUpperCase() + style.slice(1)] ?? style,
    });
  } catch {
    /* plugin not installed yet — silent no-op */
  }
}

/**
 * Open a URL. Native: in-app Safari View Controller / Custom Tabs.
 * Web: standard window.open with safe rel attributes.
 */
export async function openExternal(url: string): Promise<void> {
  if (isNative()) {
    try {
      const mod = await import(/* @vite-ignore */ "@capacitor/browser");
      await (mod as any).Browser.open({ url, presentationStyle: "popover" });
      return;
    } catch {
      /* fall through to web open */
    }
  }
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/**
 * Share via OS share sheet. Returns true if the share dialog opened, false
 * if the caller should fall back (e.g. copy-to-clipboard).
 */
export async function nativeShare(opts: { title?: string; text?: string; url: string }): Promise<boolean> {
  if (isNative()) {
    try {
      const mod = await import(/* @vite-ignore */ "@capacitor/share");
      await (mod as any).Share.share(opts);
      return true;
    } catch {
      return false;
    }
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(opts);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}