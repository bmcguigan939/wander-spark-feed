# Rebrand: dark/orange → bright sunny Golden Hour

Shift Travidz from the current dark-first / single-orange brand to a **light-mode sunset gradient** that blends cream → peach → coral → pink → twilight violet.

## New palette (Golden Hour)

| Token | Hex | Role |
|---|---|---|
| `--background` | `#fff8f0` | Warm cream page |
| `--foreground` | `#2a1b3d` | Deep twilight ink |
| `--card` / `--surface-1` | `#ffffff` | Clean white cards |
| `--surface-2` | `#fff1e3` | Soft peach panel |
| `--surface-3` | `#ffe1d0` | Apricot raise |
| `--primary` | `#ff5a8a` (sunset pink) | CTAs, links, focus ring |
| `--primary-foreground` | `#ffffff` | |
| `--accent` | `#ff8e72` (coral) | Secondary highlights |
| `--secondary` | `#fff1f5` | Quiet chips |
| `--muted-foreground` | `#7a6480` | |
| `--border` | `rgba(42,27,61,0.08)` | Soft warm hairline |
| `--sunset` | `#ffd29a` | Golden glow |
| `--coral` | `#ff8e72` | |
| `--ocean` (rename to `--twilight`) | `#a14b9c` | Dusk anchor |
| `--destructive` | `#e5384d` | Keep red, slightly warmer |

`--gradient-aurora` becomes the full sunset blend:
`linear-gradient(135deg, #fff4ea 0%, #ffd29a 25%, #ff8e72 55%, #ff5a8a 80%, #a14b9c 100%)`

All values authored in `oklch()` in `src/styles.css` (hex above is for reference). Shadows recoloured to a warm pink tint (`color-mix(... var(--primary) 30% ...)`).

## Files to change

1. **`src/styles.css`** — single source of truth.
   - Replace `:root` token block with the new light-mode tokens.
   - Rewrite `--gradient-aurora`, `--shadow-cinematic`, `--shadow-soft` to warm tints.
   - Adjust `.glass` to use `white 55%` over warm surfaces instead of dark cards.
   - Rewrite `.scrim-top` / `.scrim-bottom` so video legibility still works on a light page (keep dark scrims — they sit over video, not over the page background).
   - Remove `.dark` body class assumption if present; site becomes light-first.
   - Keep the `--font-display: Fraunces` pairing — fits the warm editorial sunset feel.

2. **`src/lib/email-templates/_brand.ts`** — update the email brand to match:
   - `background: #fff8f0`, `surface: #ffffff`, `foreground: #2a1b3d`
   - `primary: #ff5a8a`, `primaryForeground: #ffffff`
   - `muted: #7a6480`, `border: #f0e4d6`
   - Brand mark colour switches to `--primary` pink.

3. **Spot sweep** — grep for any hard-coded `bg-black`, `text-white`, `bg-zinc-9*`, `bg-slate-9*`, `from-orange-*`, `to-orange-*` in `src/components` and `src/routes` and swap them to semantic tokens (`bg-background`, `text-foreground`, `bg-aurora`, `text-primary`). No component logic changes.

4. **Video player & feed surfaces** — these intentionally stay dark for video legibility. Keep the video card, scrim overlays, and fullscreen feed using a local dark container (`bg-[#0e0a18]` → replace with a new `--video-shell` token) so the rest of the app can go light without hurting playback contrast.

## Non-goals

- No layout / copy / route changes.
- No font family change (Fraunces + Inter stays).
- No dark mode toggle this pass — pure light rebrand. We can add a dark variant later.

## Verification

- Visual pass on `/` (feed), `/login`, `/legal/*`, `/settings`, `/u/$username`, `/business`, `/studio`, `/admin`.
- Contrast check: foreground on background, primary-foreground on primary, muted-foreground on surface-2.
- Confirm CTAs, focus rings, and the aurora gradient hero all read as "sunset" not "candy".
