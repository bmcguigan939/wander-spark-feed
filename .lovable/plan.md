## Fix: regenerate AppIcon-1024.png with lowercase "t"

**Problem:** `public/appstore/AppIcon-1024.png` shows an uppercase "T" but the brand mark is lowercase "t". The source `public/icon.svg` is already correct (lowercase `t`), so only the PNG export is stale.

**Fix:** Regenerate the 1024×1024 PNG from the corrected SVG using imagegen, matching the existing gradient (orange → pink → purple) with a lowercase white "t" centered on a rounded square.

**Steps**
1. Generate a new `public/appstore/AppIcon-1024.png` (1024×1024, flat RGB, no alpha, lowercase "t") via the image tool, using the gradient and styling from `public/icon.svg`.
2. Also regenerate `public/icon-192.png` and `public/icon-512.png` so the PWA manifest icons match (they likely have the same uppercase "T" issue since they were exported alongside).
3. Verify by viewing the generated files.

**Not changing:** `public/icon.svg` (already correct), `public/manifest.webmanifest`, or any App Store metadata text.
