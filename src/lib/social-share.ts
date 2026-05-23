export type Platform = "youtube" | "tiktok" | "instagram" | "facebook" | "x";

export type SocialHandles = {
  youtube_handle?: string | null;
  tiktok_handle?: string | null;
  instagram_handle?: string | null;
  facebook_handle?: string | null;
  x_handle?: string | null;
  website_url?: string | null;
};

/** Build the canonical public profile URL for a creator on a given platform. */
export function profileUrl(platform: Platform, handle: string | null | undefined): string | null {
  if (!handle) return null;
  const h = handle.replace(/^@/, "").trim();
  if (!h) return null;
  switch (platform) {
    case "instagram": return `https://www.instagram.com/${h}/`;
    case "facebook": return `https://www.facebook.com/${h}`;
    case "tiktok": return `https://www.tiktok.com/@${h}`;
    case "youtube": return `https://www.youtube.com/@${h}`;
    case "x": return `https://x.com/${h}`;
  }
}

/**
 * Best-effort "open this platform so the creator can paste the Travidz link."
 * Prefers the creator's saved profile; otherwise opens a sensible compose /
 * upload page. For X and Facebook we use the documented web share intents,
 * which prefill the Travidz URL into a new post.
 */
export function platformOpenUrl(
  platform: Platform,
  handles: SocialHandles,
  travidzUrl: string,
  shareText?: string,
): string {
  const profile = profileUrl(platform, (handles as any)[`${platform}_handle`]);
  switch (platform) {
    case "x": {
      const params = new URLSearchParams();
      if (shareText) params.set("text", shareText);
      params.set("url", travidzUrl);
      return `https://x.com/intent/post?${params.toString()}`;
    }
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(travidzUrl)}`;
    case "instagram":
      return profile ?? "https://www.instagram.com/";
    case "tiktok":
      return profile ?? "https://www.tiktok.com/upload";
    case "youtube":
      return profile ?? "https://studio.youtube.com/";
  }
}

/** Whether the platform supports prefilling the URL into a new post. */
export function platformPrefillsUrl(platform: Platform): boolean {
  return platform === "x" || platform === "facebook";
}

/**
 * Normalise either a pasted profile URL or a handle into a bare handle for
 * storage. Returns null when empty. Falls back to the trimmed input if
 * nothing matches.
 */
export function normaliseHandle(platform: Platform, raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^@/, "");
  if (!s) return null;
  // Not a URL? Treat as a raw handle.
  if (!/^https?:\/\//i.test(s) && !/^[a-z0-9-]+\.[a-z]{2,}/i.test(s)) return s;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const path = url.pathname.replace(/^\/+|\/+$/g, "");
    const first = path.split("/")[0] ?? "";
    const cleaned = first.replace(/^@/, "");
    if (cleaned) return cleaned;
  } catch {
    /* fall through */
  }
  return s;
}