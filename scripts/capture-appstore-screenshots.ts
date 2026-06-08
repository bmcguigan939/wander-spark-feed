/**
 * Generates draft App Store screenshots from the live preview.
 *
 *   PREVIEW_URL=https://id-preview--<id>.lovable.app \
 *   bun run scripts/capture-appstore-screenshots.ts
 *
 * Requires Playwright: `bun add -d playwright && bunx playwright install chromium`.
 *
 * IMPORTANT: These are *draft* screenshots — they show web Chrome at the iOS
 * viewport, not real iOS status bar. Apple sometimes rejects them. The safer
 * path for the first submission is to install the TestFlight build on a real
 * iPhone + iPad and capture from the device. Use these as a fallback only.
 */
import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.PREVIEW_URL ?? "https://www.travidz.com";

const SCREENS: { name: string; path: string; waitFor?: string }[] = [
  { name: "01-feed", path: "/" },
  { name: "02-map", path: "/map" },
  { name: "03-deals", path: "/deals" },
  { name: "04-destinations", path: "/destinations" },
  { name: "05-collections", path: "/collections" },
];

const TARGETS = [
  { label: "iphone-6.5", width: 1290, height: 2796, deviceScaleFactor: 1, isMobile: true },
  { label: "ipad-12.9", width: 2048, height: 2732, deviceScaleFactor: 1, isMobile: false },
];

async function capture() {
  const browser = await chromium.launch();
  for (const t of TARGETS) {
    const outDir = join("public", "appstore", "screenshots", t.label);
    await mkdir(outDir, { recursive: true });
    const ctx = await browser.newContext({
      viewport: { width: t.width, height: t.height },
      deviceScaleFactor: t.deviceScaleFactor,
      isMobile: t.isMobile,
      hasTouch: t.isMobile,
      userAgent: t.isMobile
        ? devices["iPhone 14 Pro Max"].userAgent
        : devices["iPad Pro 11"].userAgent,
    });
    const page = await ctx.newPage();
    for (const s of SCREENS) {
      const url = new URL(s.path, BASE).toString();
      console.log(`[${t.label}] ${s.name} ← ${url}`);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: join(outDir, `${s.name}.png`),
        fullPage: false,
        type: "png",
      });
    }
    await ctx.close();
  }
  await browser.close();
  console.log("Done. Screenshots in public/appstore/screenshots/{iphone-6.5,ipad-12.9}/");
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});