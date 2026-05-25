
# Travidz launch — Apple-ready batch

You have Apple Developer ✅. Google Play account + company registration pending. Goal: finish every remaining blocker so the day those arrive, you trigger a Codemagic build and upload. No code waits on Google.

---

## Phase 1 — Apple identifiers (you do, takes ~30 min)

In **https://developer.apple.com/account**:

1. **Find Team ID** — top-right under your name, or Membership tab. Paste it to me.
2. **Register App ID** — Identifiers → `+` → App IDs → App → Bundle ID `com.travidz.app` (Explicit). Enable capabilities:
   - Associated Domains (for universal links)
   - Push Notifications
   - Sign in with Apple (optional, only if you want Apple sign-in later)
3. **Create APNs Auth Key** — Keys → `+` → check "Apple Push Notifications service" → download `.p8` file. **Save it immediately, Apple won't let you re-download.** Note the Key ID.
4. **Create App Store Connect record** — go to **https://appstoreconnect.apple.com** → My Apps → `+` → New App:
   - Platform: iOS
   - Name: Travidz
   - Primary Language: English (UK or US)
   - Bundle ID: com.travidz.app (the one you just registered)
   - SKU: `travidz-ios-001`

Total time: ~30 min. The .p8 + Key ID + Team ID is all I need from you.

---

## Phase 2 — Account-deletion page (Apple hard requirement)

New route `src/routes/account.delete.tsx`:
- Auth-gated under `_authenticated/` (or redirects to login)
- Clear warning: lists what gets deleted (videos, comments, likes, saves, follows, collections, push subs, profile)
- Type "DELETE" to confirm + password re-entry
- Calls existing `deleteMyAccount` server fn in `src/lib/account.functions.ts`
- After deletion → sign out → redirect to landing with confirmation toast
- Link from `/settings` "Danger zone" section

Also add a **public-facing** "How to delete your account" section to `/support` — Apple reviewers check this exists for non-signed-in visitors too.

---

## Phase 3 — Notification preference toggles (Settings)

Add a "Notifications" card to `src/routes/settings.tsx` with 4 toggles:
- New followers
- Replies & comments on my videos
- Deals expiring soon (saved deals only)
- Weekly digest

Stored in a new `notification_preferences` table (user_id PK, 4 booleans, RLS user-scoped). Server fn `updateNotificationPreferences`. Defaults: all on. The OneSignal push fan-out (Phase 6 below) reads from this table before sending.

---

## Phase 4 — Patch Team ID + assetlinks placeholder

Once you paste your Team ID:
- Replace `TEAMID` in `public/.well-known/apple-app-site-association` (2 places)
- Leave `assetlinks.json` SHA-256 placeholder until Codemagic generates the Android release keystore (one-time, post-Google-account)

---

## Phase 5 — Store listing copy

Drafts written to `/mnt/documents/store-assets/listing.md` for both stores:

**App Store:**
- App name (30 char): "Travidz"
- Subtitle (30 char): "Travel inspiration in motion"
- Promotional text (170 char)
- Description (4000 char) — story-driven, feature highlights, social proof
- Keywords (100 char, comma-separated, no spaces)
- Support URL: travidz.com/support
- Marketing URL: travidz.com
- Privacy URL: travidz.com/legal/privacy
- Category: Travel (primary) · Social Networking (secondary)
- Age rating questionnaire answers (likely 12+: infrequent travel imagery, user-generated content, location services)
- "What's New in This Version" template

**Google Play:**
- App title (30 char)
- Short description (80 char)
- Full description (4000 char)
- Same support/privacy URLs
- Content rating IARC pre-answers (Teen, likely)
- Data safety form pre-answers (collected: name, email, photos, location, app activity; purposes: account, app functionality, analytics; encrypted in transit; users can request deletion)

You'll review and tweak before submission.

---

## Phase 6 — Store screenshots (6 per device size)

I'll launch the preview at each required viewport, capture the feed/profile/deals/map/create/settings flows, and frame each one with a marketing caption + device bezel. Saved to:

```
/mnt/documents/store-assets/
  ios/iphone-6.7/  (1290 × 2796) — required, iPhone 15 Pro Max
  ios/iphone-6.5/  (1242 × 2688) — required, iPhone 11 Pro Max
  ios/ipad-12.9/   (2048 × 2732) — required if iPad enabled
  android/phone/   (1080 × 1920) — required
  android/tablet/  (1600 × 2560) — recommended
```

6 screenshots per size, captions like:
1. "Discover travel through real creators"
2. "Save deals while you watch"
3. "Book direct, support local"
4. "Map every moment"
5. "Earn from your trips"
6. "Plan in seconds, not hours"

Plus app preview poster frames (one per size).

---

## Phase 7 — OneSignal wiring (deferred until you create the app)

Not building this today since you need to:
1. Sign up at onesignal.com (free)
2. Create app, choose iOS + Android platforms
3. Upload the .p8 from Phase 1 + paste Team ID + Bundle ID
4. Give me the OneSignal App ID + REST API Key (I'll request via `add_secret`)

I'll wire `onesignal-cordova-plugin` + the 4 notification triggers + permission prompt in a follow-up session. ~20 min once secrets are in.

---

## Files I'll touch

**New**
- `src/routes/account.delete.tsx`
- `src/routes/_authenticated.tsx` (if not already present — to gate delete route)
- `supabase/migrations/<ts>_notification_preferences.sql`
- `src/lib/notification-preferences.functions.ts`
- `/mnt/documents/store-assets/listing.md`
- `/mnt/documents/store-assets/ios/...` + `android/...` (screenshots)

**Modified**
- `public/.well-known/apple-app-site-association` (Team ID patch)
- `src/routes/settings.tsx` (Notifications card + Danger zone link)
- `src/routes/support.tsx` (public account-deletion instructions)
- `src/lib/push.functions.ts` (read preferences before sending — small change, OneSignal wiring still deferred)

---

## What's still on you, in order

1. ⬜ Grab Team ID + .p8 + Key ID from Apple (Phase 1) → paste Team ID here
2. ⬜ Wait on company registration + Google Play account ($25)
3. ⬜ Sign up for OneSignal, give me App ID + REST API Key
4. ⬜ Review the listing copy + screenshots I generate
5. ⬜ Connect Apple account to Codemagic ("Fetch signing files" — automatic)
6. ⬜ Trigger first `ios-build` workflow → upload IPA to App Store Connect
7. ⬜ Submit for review (Apple: 1–3 days)

Confirm and I'll execute Phases 2, 3, 5, 6 now. Phase 4 (Team ID patch) the moment you paste the ID. Phase 7 (OneSignal) once you have the keys.
