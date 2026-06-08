# Travidz — Apple Privacy Nutrition Label answers

Use these answers in App Store Connect → App Privacy. They reflect the data the codebase actually collects (Supabase auth + profiles, Mux video upload, Stripe checkout, Mapbox map search, basic analytics). Travidz uses **no third-party advertising or tracking SDKs**, so the "Used to Track You" section is empty.

## 1. Data Used to Track You
**None.** Travidz does not share data with third parties for tracking purposes and does not use the IDFA for cross-app/website tracking.

## 2. Data Linked to You
| Data type | Purposes | Notes |
|---|---|---|
| Email Address | App Functionality, Account Management | Required for sign-in |
| Name | App Functionality | Profile display |
| Photos or Videos | App Functionality, User Content | Creator-uploaded videos via Mux |
| Coarse Location | App Functionality | Map search; not precise GPS |
| Purchase History | App Functionality | Booking and payout history |
| Customer Support | App Functionality | Support messages |
| User Content (other) | App Functionality | Reviews, comments, collections |
| Crash Data | App Functionality, Analytics | Captured via in-house error reporter |
| Performance Data | Analytics | Aggregated only |
| Other Diagnostic Data | Analytics | Aggregated only |

## 3. Data Not Linked to You
| Data type | Purposes |
|---|---|
| Product Interaction | Analytics (view/like/save counts) |
| Search History | Analytics (anonymised search terms) |

## 4. Permissions the app requests at runtime
| iOS permission | Why | Info.plist string |
|---|---|---|
| Camera | Record videos to upload | "Travidz uses the camera so you can film travel videos to share." |
| Photo Library | Pick videos to upload | "Travidz needs access to your library to upload travel videos." |
| Location (When In Use) | Centre the discovery map on the user | "Travidz uses your location to show nearby spots on the map." |
| Notifications | New followers, booking updates | Standard push prompt |

## 5. GDPR statement (UK/EU)
Travidz Limited is the data controller. Users can request data export or deletion in **Settings → Account → Delete account** (handled by `src/routes/account.delete.tsx`). Lawful basis: contract (account, bookings), legitimate interest (security, anti-fraud), consent (marketing email — opt-in only).
