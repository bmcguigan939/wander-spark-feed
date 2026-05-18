# Fix: `/invest` 404 on published site

## Diagnosis

The `/invest` route exists and is correctly wired:
- `src/routes/invest.tsx` is present
- `src/routeTree.gen.ts` registers `/invest` (lines 156, 1166–1169, etc.)
- The page renders fine on the **preview** URL

The 404 you're seeing is from the **published** URL (`wander-spark-feed.lovable.app/invest`). That deployment was created *before* the `/invest` route was added, so the published bundle doesn't contain it yet. TanStack route files only ship to production on republish.

## Fix

Republish the project. No code changes required.

After republish, the share link will be:
`https://wander-spark-feed.lovable.app/invest`

## If you'd rather not republish yet

You can share the preview URL in the meantime:
`https://id-preview--144ee3b9-80e0-4ec8-883d-e0d5686cb4a1.lovable.app/invest`

(Preview URLs are fine for quick VC reviews but rotate per project; the published URL is the stable one.)

## Optional follow-ups (only if you want them)

- Add per-VC tracking: `/invest?ref=sequoia` — already supported in the page; we'd just log views to a `pitch_views` table.
- Add a Calendly link to the "Let's talk" CTA (currently `mailto:founders@travidz.com`).
- Toggle `noindex` off if you want the page Google-indexable (currently hidden from search).

Let me know if you want any of these before/after republishing.
