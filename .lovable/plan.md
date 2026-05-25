## Move the Founding Creator spots badge lower on the page

The "5,000 of 5,000 Founding Creator spots left — 50% for 24 months" pill currently sits at the very top of the hero, which feels off while we're still pre-launch and the counter is at its starting value.

### Change
In `src/components/landing/LandingPage.tsx`:
- Remove the spots badge from the `Hero` component (lines 96–101).
- Re-render the same badge as a centered standalone strip placed **between the `HowItWorks` section and the `WhyTravidz`/pricing section** further down the page, so visitors see the headline + CTAs first and only encounter the founding-spots messaging after they understand the product.
- Keep the same styling (rounded pill, Sparkles icon, coral accent) so it stays on-brand, just in a quieter position.
- Keep the conditional render (`spotsRemaining > 0`) so it disappears cleanly once spots fill up.

No backend, copy, or commission logic changes — purely repositioning a single element on the landing page.
