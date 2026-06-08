# Travidz — Monetisation summary (for Apple & internal reference)

| Item | How it's billed | Apple takes a cut? |
|---|---|---|
| Hotel bookings | Stripe (real-world service) | No — Guideline 3.1.3(e) |
| Tour & experience bookings | Stripe (real-world service) | No — Guideline 3.1.3(e) |
| Creator payouts | Stripe Connect (Express) | No — payout, not purchase |
| Premium subscriptions | **None at v1.0** | n/a |
| In-app coins / digital goods | **None** | n/a |
| Advertising | **None** | n/a |

If digital-only premium features are ever added (e.g. a Pro creator tier unlocked inside the app), they must go through **Apple In-App Purchase**. Stripe cannot be used for purely-digital content delivered inside an iOS app — Apple rejects under 3.1.1.

Commission structure (Stripe, not Apple):
- 10% platform fee on each booking
- Creator share (when a booking is attributed to a video) governed by `src/lib/commission.ts`
- Stripe processing fees are deducted before the platform/creator split
