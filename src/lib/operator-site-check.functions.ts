import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type OperatorSiteCheck = {
  ok: boolean;
  status?: number;
  finalUrl?: string;
  title?: string | null;
  faviconUrl?: string | null;
  error?: string;
};

/**
 * Best-effort server-side reachability check for an operator's booking URL.
 * Used at signup to show a trustworthy preview card without trying to
 * iframe the page (most booking engines block framing via X-Frame-Options).
 */
export const checkOperatorSiteUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ url: z.string().url().max(500) }).parse(input),
  )
  .handler(async ({ data }): Promise<OperatorSiteCheck> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(data.url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent":
            "TravidzPreviewBot/1.0 (+https://travidz.com) — operator signup preview",
          accept: "text/html,application/xhtml+xml",
        },
      });
      const finalUrl = res.url || data.url;
      if (!res.ok) {
        return { ok: false, status: res.status, finalUrl, error: `HTTP ${res.status}` };
      }
      const body = (await res.text()).slice(0, 200_000);
      const titleMatch = body.match(/<title[^>]*>([^<]{1,300})<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : null;
      let faviconUrl: string | null = null;
      try {
        const u = new URL(finalUrl);
        faviconUrl = `${u.origin}/favicon.ico`;
      } catch {
        // ignore
      }
      return { ok: true, status: res.status, finalUrl, title, faviconUrl };
    } catch (e: any) {
      return {
        ok: false,
        error:
          e?.name === "AbortError"
            ? "Request timed out"
            : e?.message ?? "Could not reach that URL",
      };
    } finally {
      clearTimeout(timer);
    }
  });