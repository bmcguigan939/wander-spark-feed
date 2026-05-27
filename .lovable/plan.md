Two unrelated fixes.

## 1. Collab defaults — remove the editable Commission % field

Commission is platform-fixed (11% for stays via Travidz; 11% added on top for activities). Letting operators type a "default commission %" on `business.collabs` is misleading — it implies the rate is negotiable per-collab, which it isn't.

Changes in `src/routes/business.collabs.tsx`:
- Remove the `Commission %` `<Input>` from the "Default terms" grid (the field next to "Comp nights").
- Drop the local `commission` state and its `useEffect` seed.
- Stop sending `default_commission_pct` from `saveDefaultsMut` (let the column default / existing value stand on the server side — no schema change).
- Drop `commission` from the `applyRecommended()` setter.
- Tighten the section subtitle so operators understand: replace "Set once. Every creator you accept inherits these terms…" with a one-liner clarifying that Travidz commission is platform-fixed and these defaults only cover deliverables, comp nights, usage rights, and brand voice.

No DB migration, no server-fn signature change — `default_commission_pct` simply stops being editable from the UI. (`COMMISSION.totalPct = 11` is already the source of truth everywhere that matters: payouts, invite acceptance, redemptions.)

## 2. Invite email — recipient lands on creator's profile instead of the invite

Root cause: `src/lib/outreach.functions.ts` (the AI draft builder for `BusinessInviteEmail`) pushes `Travidz: https://travidz.com/u/{creator.username}` into the `socialLinksText` block that gets rendered verbatim as plain text in the email body. Most mail clients auto-linkify those URLs, so the recipient sees several blue links in the body (Instagram, TikTok, …, **Travidz profile**) above the "Approve your listing" CTA button. Tapping the first / most familiar "travidz.com" link drops them on the creator's public profile (`/u/linda`) — exactly what the user reported.

Changes in `src/lib/outreach.functions.ts` (around line 157-160):
- Stop appending the creator's own Travidz profile (`https://travidz.com/u/${creator.username}`) to `socialLinks`. The email is *from* that creator — linking back to their profile adds no value for the business and competes with the invite CTA. Off-platform socials (Instagram, TikTok, YouTube, etc.) stay, since those help the business vet the creator.
- Update the system-prompt rule (around line 168) so the draft also avoids re-pasting any `travidz.com/u/...` URL in the body, matching the existing ban on `travidz.com/business/invite` URLs.
- Update `fallbackInviteDraft` similarly if it includes the Travidz profile link (verify and strip if present).

Changes in `src/lib/email-templates/business-invite.tsx`:
- Move the `<Button href={inviteUrl}>Approve your listing</Button>` **above** the rendered `bodyText` paragraphs (currently it sits after them). The primary CTA should be the first tappable thing in the email, not the last — this is the standard transactional-email pattern and prevents recipients from tapping a stray social URL first.
- Keep the existing button + terms block intact below the body for users who scroll.

No schema, no server-fn signature changes. Existing queued emails are unaffected; new sends use the cleaner draft and reordered template.

## Out of scope

- The `default_commission_pct` column on `collab_defaults` stays in the DB (harmless; no UI surface left).
- No change to actual commission math anywhere — this is purely UI + email-copy hygiene.
- Not touching the open security-scan findings shown in the More panel.
