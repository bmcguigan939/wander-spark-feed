# Smart Deals empty-state → AI business outreach

## What changes (and where)

Only `src/components/create/SmartDealsSheet.tsx`. No schema, no backend changes — wires up server functions that already exist.

When the AI finds no matching pre-existing deals, replace the current "we'll keep looking in the background" copy with a panel that:

1. Tells the creator: "AI is finding this location's website, email and phone so you can invite them to collaborate."
2. Pulls AI-detected businesses for the video using the existing `listSuggestionsForVideo` server fn (table `video_business_suggestions` — already populated by `runBusinessExtraction`).
3. For each suggestion (name, city/country, website guess, confidence), shows a **Send collaboration contract** button.
4. Quotes the set fee from `COMMISSION` (`creator_share_pct` / `platform_share_pct`) so the creator knows the terms before sending.

## Send-contract flow

Clicking **Send collaboration contract** on a suggestion opens a compact inline form (inside the same sheet) prefilled with:
- Business name (from suggestion)
- Website (from `website_guess`, editable)
- City (from suggestion)
- Contact email (required — empty by default, creator pastes from the AI-surfaced details or their own research)
- Contact phone (optional)

Submit calls `createBusinessInvite({ videoId, businessName, websiteUrl, contactEmail, ... })`. On success:
- Call `markSuggestionConverted({ id: suggestionId, inviteId })` to remove it from the list.
- Toast: "Invite sent — they'll get a contract to confirm the fee split."

A secondary **Dismiss** action calls `dismissSuggestion`.

If no suggestions yet (extraction still running), show a subtle loading line "AI is scanning the video for business details…" with a **Re-scan** link that calls `rerunBusinessExtraction`.

## Copy (final strings)

- Header (unchanged): "Smart deals for this video"
- New subhead when 0 deals: "No bookable deals yet — but Travidz AI is finding the business so you can invite them directly."
- Per-suggestion footer line: "Travidz handles the contract. You earn {creatorShare}% on every booking they get from your video."
- Submit button: "Send collaboration contract"

## Out of scope

- No edits to outreach email templates, schema, or the deals flow itself.
- No new server functions — `listSuggestionsForVideo`, `rerunBusinessExtraction`, `createBusinessInvite`, `markSuggestionConverted`, `dismissSuggestion` already exist.
- The existing "deals found" path stays exactly as it is today.

## Technical notes

- Use `useServerFn` + `useQuery` for `listSuggestionsForVideo` (key `["video-business-suggestions", videoId]`, enabled when sheet is open).
- Use `useMutation` for create/convert/dismiss; on success invalidate the suggestions query.
- Form lives in component state (no extra files); validates email client-side, server validates with existing Zod schema.
