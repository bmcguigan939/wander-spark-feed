# Switch favicon to lowercase "t"

Regenerate the icon set with a lowercase **t** instead of uppercase T, keeping the same sunset → coral → twilight gradient tile.

## Steps

1. Generate a new 1024×1024 source PNG: rounded-square gradient tile, white lowercase **t** (geometric sans-serif, bold) centered.
2. Resize into:
   - `public/icon-512.png` (512×512)
   - `public/icon-192.png` (192×192)
   - `public/apple-touch-icon.png` (180×180)
   - `public/favicon.ico` (16/32/48 multi-size)
3. Update `public/icon.svg` to render a lowercase `t` instead of `T`.
4. No changes needed to `__root.tsx` or the manifest — file paths stay the same.

After publishing, Google will eventually re-crawl and pick up the new mark (1–4 weeks).
