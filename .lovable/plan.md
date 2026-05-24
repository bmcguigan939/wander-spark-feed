# Get a Travidz symbol next to your name in Google results

That symbol Google shows is your **favicon**. You already have `public/icon.svg` (gradient "T"), but Google's favicon crawler has a few extra requirements, and it can take 1–4 weeks to refresh once everything is right.

## What we'll do

### 1. Generate a polished, high-res icon set
Keep the gradient "T" concept but render it on the sunset → coral → twilight brand gradient tile (matches the logo in your top bar) and ship it at the sizes Google + iOS + Android all want:

- `public/favicon.ico` — 32×32, classic browser tab icon (also a Google fallback)
- `public/icon-192.png` — 192×192, Google search + PWA
- `public/icon-512.png` — 512×512, PWA splash + Android home screen
- `public/apple-touch-icon.png` — 180×180, iOS home screen
- Keep `public/icon.svg` — refresh it to match the new design (vector, scales infinitely)

### 2. Wire them into `src/routes/__root.tsx`
Today only one `<link rel="icon">` points at the SVG. Google specifically looks for a `rel="icon"` with a real raster size declared. Update the `links:` array to:

```ts
{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
{ rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
{ rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
{ rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
{ rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
```

### 3. Update `public/manifest.webmanifest`
Replace the single SVG entry with the PNG set so Android/PWA installs use the proper raster icons.

### 4. Update the JSON-LD Organization `logo`
Point it at `/icon-512.png` instead of the SVG — Google's structured-data parser prefers raster logos with known dimensions.

## After deploy

Google won't update overnight. To speed it up:

1. **Publish** the change.
2. In **Google Search Console** → URL Inspection, paste `https://www.travidz.com/` and click **Request indexing**. This re-fetches the page + favicon.
3. Wait. Typical refresh is 1–4 weeks. The favicon must be reachable at a stable URL the whole time (it will be).

## Why this works

Google's documented favicon rules: square, ≥ 48px, multiple of 48 preferred, referenced via `<link rel="icon">`, crawlable, and the same favicon used consistently. A single SVG technically qualifies but PNG fallbacks at 192/512 are what their crawler actually caches and serves on mobile results. Source: developers.google.com/search/docs/appearance/favicon-in-search.

## Files changed

- `public/favicon.ico` (new), `public/icon-192.png` (new), `public/icon-512.png` (new), `public/apple-touch-icon.png` (new), `public/icon.svg` (refreshed)
- `src/routes/__root.tsx` — expanded `links` + updated JSON-LD logo
- `public/manifest.webmanifest` — PNG icon set
