// Shared URL guards.
//
// Used by any code that 302-redirects users to an external "supplier" URL
// (business websites, deal URLs, etc.) or persists such a URL. Prevents
// self-referential URLs that would loop the user back into Travidz — the
// most common symptom of which is "the Book button just brings me back to
// the same video".

const SELF_HOSTS = new Set([
  "travidz.com",
  "www.travidz.com",
  "wander-spark-feed.lovable.app",
]);

const SELF_HOST_SUFFIXES = [
  ".lovable.app",
  ".lovable.dev",
];

/** Returns true if `url` resolves to a Travidz-owned host. */
export function isSelfHost(url: string | null | undefined): boolean {
  if (!url) return false;
  let raw = url.trim();
  if (!raw) return false;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (SELF_HOSTS.has(host)) return true;
  return SELF_HOST_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s));
}