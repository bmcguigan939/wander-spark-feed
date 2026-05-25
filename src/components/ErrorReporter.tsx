import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { logClientError } from "@/lib/errors.functions";

// Throttle: max one report per (message+route) per session, and a small global cap.
const seen = new Set<string>();
let totalReported = 0;
const MAX_REPORTS = 25;

export function ErrorReporter() {
  const router = useRouter();
  const report = useServerFn(logClientError);
  const reportRef = useRef(report);
  reportRef.current = report;

  useEffect(() => {
    function send(payload: {
      message: string;
      stack?: string | null;
      source: string;
    }) {
      if (totalReported >= MAX_REPORTS) return;
      const route =
        typeof window !== "undefined" ? window.location.pathname : null;
      const key = `${payload.source}:${payload.message.slice(0, 200)}:${route ?? ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      totalReported += 1;
      void reportRef.current({
        data: {
          message: payload.message.slice(0, 2000),
          stack: payload.stack ? payload.stack.slice(0, 8000) : null,
          route,
          source: payload.source,
          user_agent:
            typeof navigator !== "undefined"
              ? navigator.userAgent.slice(0, 500)
              : null,
          severity: "error",
        },
      }).catch(() => {});
    }

    function onError(e: ErrorEvent) {
      const err = e.error as Error | undefined;
      send({
        message: err?.message ?? e.message ?? "Unknown error",
        stack: err?.stack ?? null,
        source: "window.error",
      });
    }
    function onRejection(e: PromiseRejectionEvent) {
      const r: any = e.reason;
      const message =
        (r && (r.message ?? String(r))) || "Unhandled promise rejection";
      send({
        message,
        stack: r?.stack ?? null,
        source: "unhandledrejection",
      });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [router]);

  return null;
}