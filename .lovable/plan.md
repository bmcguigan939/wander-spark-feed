## What's actually happening

The "Book direct" pink button → `/api/public/b/$id?v=…` → 302-redirects to the business's `business_website_url`.

For the **Test 02** business, that URL is set to `https://www.travidz.com/`, so the redirect just lands you back on the Travidz feed — which auto-plays the same video. It looks like the button "did nothing", but it's actually completing a redirect loop back to our own site.

## Fix — 3 parts

### 1. Clean up the bad data (the immediate cause)

Either:
- Update Test 02's website to the real booking URL, or
- Blank it out so the "Book direct" card stops rendering for that business.

I'll do this with a one-off SQL update once you tell me which.

### 2. Block self-referential URLs at the redirect handler

`src/routes/api/public/b.$id.ts` — after resolving `business_website_url`, reject any URL whose host is one of ours (`travidz.com`, `www.travidz.com`, `*.lovable.app`). Return a 404 (`"Business unavailable"`) instead of redirecting. This stops the loop even if someone re-enters a bad URL later.

### 3. Validate on the way in (business profile form)

Wherever `business_website_url` is saved (the business onboarding / profile form), add the same host check + a clear inline error: *"Enter your own booking website, not travidz.com."* Prevents this from happening again.

## Out of scope

- The other pink **"Book →"** under *Book this trip* (BBM Best Stays) is fine — its URL is a real external site.
- No change to the feed `VideoCard` itself; the link is correct, the destination is wrong.

## Question before I build

Which do you want for Test 02's website:
1. Set to a specific URL (paste it and I'll update), or
2. Clear it (the "Book direct" card will simply not show until they set a real one)?
