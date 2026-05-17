import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const KEY = "travidz_pwa_prompt";

/**
 * Lightweight PWA install nudge. Captures `beforeinstallprompt`, waits
 * until the user has visited at least 3 times, then surfaces a non-blocking
 * banner. Honours dismissal for 30 days.
 */
export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

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
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

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
