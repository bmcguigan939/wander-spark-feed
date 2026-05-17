import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const STORAGE_KEY = "travidz_cookie_consent_v1";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {}
  }, []);

  const decide = (value: "accepted" | "essential") => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ value, at: new Date().toISOString() }),
      );
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur md:inset-x-auto md:right-4 md:left-auto md:w-[28rem]"
    >
      <p className="text-sm font-semibold text-foreground">We use cookies</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        We use strictly necessary cookies for sign-in and security. With your
        consent, we also use optional cookies to remember preferences and
        measure how the app is used.{" "}
        <Link to="/legal/cookies" className="underline">
          Learn more
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={() => decide("essential")}
          className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
        >
          Essential only
        </button>
        <button
          onClick={() => decide("accepted")}
          className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          Accept all
        </button>
      </div>
    </div>
  );
}

export function hasOptionalCookieConsent(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return JSON.parse(raw).value === "accepted";
  } catch {
    return false;
  }
}