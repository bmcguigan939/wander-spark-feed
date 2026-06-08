# Travidz — App Review Information

Paste this into App Store Connect → App Review Information.

## Sign-in required
Yes.

- **Username:** apple-review@travidz.com
- **Password:** `Travidz-Review-2026!LiR3ZKhb`

Account is seeded via `bun run scripts/seed-apple-reviewer.ts` (one-off, run against production). The app is a **Universal app (iPhone + iPad)** — please test on both form factors.

The account is pre-verified, has a sample saved collection, an in-progress itinerary, and one demo booking so reviewers can exercise every major flow without filling forms.

## Contact information
- **First name:** (your name)
- **Last name:** (your name)
- **Email:** support@travidz.com
- **Phone:** (UK number)

## Notes to the reviewer
Travidz is a travel marketplace. Creators film short videos of real spots they visited; viewers can save them, build itineraries, and book the same hotel or experience at a creator-negotiated price.

Key flows to test:
1. **Sign in** with the credentials above (or sign up with a new email — instant).
2. **Feed** — scroll the home feed; tap a video to expand details, like, save, or open the linked deal.
3. **Book a deal** — open any deal and tap "Book". Checkout uses **Stripe in test mode** for this account. Use card `4242 4242 4242 4242`, any future expiry, any CVC, any postcode.
4. **Map** — switch to the map tab to browse verified businesses by location.
5. **Become a creator** — Profile → "Become a creator" unlocks the video upload flow. All uploads are scanned by automated moderation before they go live.

## Why Travidz uses Stripe instead of Apple In-App Purchase
All paid transactions in Travidz are **real-world goods and services** (hotel nights, tours, experiences) delivered offline, which fall under App Store Review Guideline 3.1.3(e) ("Goods and Services Outside of the App"). They are processed through Stripe, exactly as Airbnb, Booking.com, and Expedia do.

Travidz has **no digital subscriptions, no premium unlocks, and no in-app virtual currency**, so Apple In-App Purchase is not applicable.

## Demo content moderation
All user-generated video, images, and text are passed through automated moderation (see `src/lib/moderation.functions.ts`) before becoming visible. Users can report any post via the "⋯" menu on any video; reports go to an admin queue (`/admin/moderation`) reviewed within 24 hours, in line with Guideline 1.2.

## Account deletion
Reviewers can delete the test account in-app at **Settings → Account → Delete account** (route: `src/routes/account.delete.tsx`).
