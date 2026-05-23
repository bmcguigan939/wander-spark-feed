## Goal

Make Travidz easy for Google to find, index, and display nicely when someone searches the brand. Sitemap + robots already exist and look healthy — this plan focuses on the gaps.

## 1. Organization JSON-LD on the root

Add a sitewide `Organization` schema in `src/routes/__root.tsx` (alongside existing meta). Helps Google build a knowledge-panel-style result for "Travidz" with logo + social links.

Fields: `name: "Travidz"`, `url: "https://www.travidz.com"`, `logo` (use `/icon.svg` resolved to absolute URL), `sameAs` (your social profiles — I'll need handles from you, see Open Questions).

Keep the existing `WebSite` + `SearchAction` JSON-LD that's on `/`.

## 2. Branded OG / Twitter share image

Today `og:image` in `__root.tsx` points at an old uploaded file. Generate a 1200×630 branded share card matching the new landing page (gradient background, "Post travel videos. Get paid when people book.", Travidz wordmark).

- Generate with `imagegen` (premium quality, contains text) → `src/assets/og-cover.jpg`.
- Update `og:image`, add `twitter:card: summary_large_image` and `twitter:image` in `__root.tsx`.
- Result: nice preview card whenever the link is shared on Instagram, WhatsApp, X, iMessage, etc.

## 3. Google Search Console verification + indexing request

This is the one that actually gets you indexed fast. Flow:

1. You connect the **Google Search Console** connector (Lovable → Connectors → Google Search Console → sign in with the Google account that should own the property).
2. I call the connector to request a verification meta tag.
3. I add the `<meta name="google-site-verification" content="…" />` tag to `__root.tsx`.
4. You publish, then I call the verify endpoint and add `https://www.travidz.com/` to your Search Console properties — all from here.
5. Once verified, I can also submit the sitemap (`/sitemap.xml`) so Google starts crawling immediately instead of waiting days.

You won't have to leave Lovable for any of this beyond the initial connector sign-in.

## Out of scope

- Sitemap / robots changes — both already exist and cover the new landing route via `/`.
- Bing / Yandex verification — can add later if you want.
- Paid Google Ads.

## Open questions

1. Do you have public social handles to include in `sameAs` (Instagram, TikTok, YouTube, X)? If yes, paste them; if not, I'll ship without and add later.
2. OK to generate a new branded OG image (premium image gen, has text)?
3. Ready to connect the **Google Search Console** connector now so I can run the verification end-to-end?