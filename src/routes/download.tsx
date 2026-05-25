import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode.react";
import { Apple, Smartphone, Share, Plus, Check, Compass, ArrowRight, Bell } from "lucide-react";
import { toast } from "sonner";
import { joinLaunchWaitlist } from "@/lib/waitlist.functions";
import appIcon from "@/assets/app-icon-1024.png";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const iOSUA = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = ua.includes("Mac") && (navigator as any).maxTouchPoints > 1;
  if (iOSUA || iPadOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Get Travidz on your phone — App Store & Google Play" },
      {
        name: "description",
        content:
          "Install Travidz on iPhone or Android. Discover travel through real videos, save spots, and book directly. Coming soon to the App Store and Google Play.",
      },
      { property: "og:title", content: "Get Travidz on your phone" },
      { property: "og:description", content: "Coming soon to App Store and Google Play. Add to your home screen today." },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const downloadUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://www.travidz.com/download";
    return `${window.location.origin}/download`;
  }, []);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-black tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--sunset)] to-[var(--coral)] text-white">
              <Compass className="h-4 w-4" />
            </span>
            travidz
          </Link>
          <Link
            to="/login"
            search={{ mode: "signup" } as never}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
      </header>

      <section className="px-5 pt-12 pb-10 text-center sm:pt-20">
        <div className="mx-auto max-w-2xl">
          <img
            src={appIcon}
            alt="Travidz app icon"
            width={112}
            height={112}
            className="mx-auto h-24 w-24 rounded-[28%] shadow-2xl shadow-[var(--coral)]/30 sm:h-28 sm:w-28"
          />
          <h1 className="mt-7 font-display text-4xl font-black tracking-tight sm:text-6xl">
            Travidz on your{" "}
            <span className="bg-gradient-to-r from-[var(--sunset)] via-[var(--coral)] to-[var(--twilight)] bg-clip-text text-transparent">
              home screen
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg text-foreground/70">
            {platform === "desktop"
              ? "Open this page on your phone to install. App Store and Google Play coming soon."
              : "Add Travidz to your Home Screen for a full-screen, app-like experience today."}
          </p>
        </div>
      </section>

      <section className="px-5 pb-8">
        <div className="mx-auto max-w-2xl">
          {platform === "ios" && (
            <button
              onClick={() => setShowIos(true)}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--sunset)] via-[var(--coral)] to-[var(--twilight)] px-6 py-5 text-base font-bold text-white shadow-xl shadow-[var(--coral)]/40 transition hover:scale-[1.02]"
            >
              <Apple className="h-6 w-6" />
              Add to iPhone Home Screen
              <ArrowRight className="h-5 w-5" />
            </button>
          )}

          {platform === "android" && (
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("travidz:show-install"));
                toast.success("Look for the install prompt at the bottom of your screen");
              }}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--sunset)] via-[var(--coral)] to-[var(--twilight)] px-6 py-5 text-base font-bold text-white shadow-xl shadow-[var(--coral)]/40 transition hover:scale-[1.02]"
            >
              <Smartphone className="h-6 w-6" />
              Add to Android Home Screen
              <ArrowRight className="h-5 w-5" />
            </button>
          )}

          {platform === "desktop" && (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-border/40 bg-card/40 p-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  On your phone
                </p>
                <p className="mt-2 text-lg font-semibold">
                  Scan the QR code with your phone camera to open this page.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Or visit <span className="font-mono text-foreground">travidz.com/download</span> directly.
                </p>
              </div>
              <div className="flex items-center justify-center rounded-2xl border border-border/40 bg-white p-5">
                <QRCode value={downloadUrl} size={160} bgColor="#ffffff" fgColor="#0F172A" />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="px-5 py-12">
        <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
          <StoreComingSoon
            platform="ios"
            icon={Apple}
            store="App Store"
            sub="Coming soon to iPhone & iPad"
          />
          <StoreComingSoon
            platform="android"
            icon={Smartphone}
            store="Google Play"
            sub="Coming soon to Android"
          />
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-border/40 bg-card/40 p-7">
          <h2 className="font-display text-2xl font-bold">Why add Travidz to your phone?</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {[
              "Full-screen experience — no browser bars",
              "Loads instantly from your home screen icon",
              "Save videos and book deals on the move",
              "Get notified when creators you follow post new spots",
            ].map((b) => (
              <li key={b} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--coral)]" />
                <span className="text-foreground/85">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {showIos && <IosInstructions onClose={() => setShowIos(false)} />}
    </main>
  );
}

function StoreComingSoon({
  platform,
  icon: Icon,
  store,
  sub,
}: {
  platform: "ios" | "android";
  icon: typeof Apple;
  store: string;
  sub: string;
}) {
  const join = useServerFn(joinLaunchWaitlist);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await join({ data: { email: email.trim(), platform, source: "download_page" } });
      setDone(true);
      toast.success(`We'll email you when Travidz lands on the ${store}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't sign up — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-foreground/5 p-2.5">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-base font-bold">{store}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
      {done ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-foreground/5 px-3 py-2.5 text-sm">
          <Bell className="h-4 w-4 text-[var(--coral)]" />
          You're on the list.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
          >
            {submitting ? "…" : "Notify me"}
          </button>
        </form>
      )}
    </div>
  );
}

function IosInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-sm rounded-t-3xl border-t border-border bg-card p-6 shadow-2xl sm:rounded-3xl sm:border">
        <div className="mb-1 flex items-center gap-2">
          <img src={appIcon} alt="" className="h-10 w-10 rounded-xl" />
          <p className="text-base font-semibold">Add Travidz to Home Screen</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Three quick taps to get the full-screen, Instagram-style experience.
        </p>
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">1</span>
            <span className="flex-1">
              Tap the <Share className="mx-1 inline h-4 w-4 align-text-bottom" /> <span className="font-semibold">Share</span> button at the bottom of Safari.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">2</span>
            <span className="flex-1">
              Scroll down and tap <span className="font-semibold">Add to Home Screen</span> <Plus className="mx-1 inline h-4 w-4 align-text-bottom" />.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">3</span>
            <span className="flex-1">Open Travidz from your Home Screen — no browser bars.</span>
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