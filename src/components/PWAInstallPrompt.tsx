import { useEffect, useState } from "react";
import { X, Download, Share, Plus } from "lucide-react";
import { isNative } from "@/lib/native";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const KEY = "travidz_pwa_prompt";
const IOS_KEY = "travidz_pwa_ios";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPhone / iPod, plus iPadOS 13+ which reports as Mac with touch.
  const iOSUA = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = ua.includes("Mac") && (navigator as any).maxTouchPoints > 1;
  return iOSUA || iPadOS;
}

function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // Exclude in-app browsers (Chrome iOS = CriOS, Firefox iOS = FxiOS) and embedded webviews.
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line/.test(ua);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if ((window.navigator as any).standalone === true) return true;
  try { return window.matchMedia("(display-mode: standalone)").matches; } catch { return false; }
}

/**
 * Lightweight PWA install nudge. Captures `beforeinstallprompt`, waits
 * until the user has visited at least 3 times, then surfaces a non-blocking
 * banner. Honours dismissal for 30 days.
 *
 * On iOS Safari there is no `beforeinstallprompt`, so we show a parallel
 * "Add to Home Screen" instructions sheet that mirrors the Instagram
 * full-screen experience the user expects.
 */
export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already running inside the native shell — no PWA install prompt needed.
    if (isNative()) return;

    // Track visit count
    try {
      const v = Number(localStorage.getItem(`${KEY}_visits`) || "0") + 1;
      localStorage.setItem(`${KEY}_visits`, String(v));
    } catch {}

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      try {
        const dismissedAt = Number(localStorage.getItem(`${KEY}_dismissed`) || "0");
        const visits = Number(localStorage.getItem(`${KEY}_visits`) || "0");
        const expired = Date.now() - dismissedAt > 30 * 24 * 60 * 60 * 1000;
        if (visits >= 3 && expired) setShow(true);
      } catch {
        setShow(true);
      }
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS: no beforeinstallprompt fires, decide based on UA + standalone state.
    if (isIos() && isSafari() && !isStandalone()) {
      try {
        const dismissedAt = Number(localStorage.getItem(`${IOS_KEY}_dismissed`) || "0");
        const expired = Date.now() - dismissedAt > 14 * 24 * 60 * 60 * 1000;
        if (expired) setShowIos(true);
      } catch {
        setShowIos(true);
      }
    }

    // Manual re-open from Settings.
    const onForce = () => {
      if (isIos() && !isStandalone()) setShowIos(true);
    };
    window.addEventListener("travidz:show-install", onForce);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("travidz:show-install", onForce);
    };
  }, []);

  if (showIos) return <IosInstructions onClose={() => {
    try { localStorage.setItem(`${IOS_KEY}_dismissed`, String(Date.now())); } catch {}
    setShowIos(false);
  }} />;

  if (!show || !deferred) return null;

  const dismiss = () => {
    try { localStorage.setItem(`${KEY}_dismissed`, String(Date.now())); } catch {}
    setShow(false);
  };

  const install = async () => {
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {}
    setDeferred(null);
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="rounded-xl bg-primary/10 p-2 text-primary"><Download className="h-5 w-5" /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Install Travidz</p>
          <p className="mt-1 text-xs text-muted-foreground">Faster access from your home screen.</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={install}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
            >Install</button>
            <button
              onClick={dismiss}
              className="rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IosInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-sm rounded-t-3xl border-t border-border bg-card p-6 shadow-2xl sm:rounded-3xl sm:border">
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-1 flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary"><Download className="h-5 w-5" /></div>
          <p className="text-base font-semibold">Get the full-screen experience</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Add Travidz to your Home Screen to hide Safari's bars and use it like a native app — just like Instagram.
        </p>
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">1</span>
            <span className="flex-1">Tap the <Share className="mx-1 inline h-4 w-4 align-text-bottom" /> <span className="font-semibold">Share</span> button at the bottom of Safari.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">2</span>
            <span className="flex-1">Scroll down and tap <span className="font-semibold">Add to Home Screen</span> <Plus className="mx-1 inline h-4 w-4 align-text-bottom" />.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">3</span>
            <span className="flex-1">Open Travidz from your Home Screen — full-screen, no browser bars.</span>
          </li>
        </ol>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
