## Goal

Extend the existing auto-tag pipeline (`runAutoTag` in `src/lib/ai.functions.ts`) so it also extracts **businesses mentioned** in a video (hotels, restaurants, tour operators, etc.) and surfaces them as one-tap suggestions inside the **Businesses featured** panel on `studio.videos.$id`. One tap converts a suggestion into a `business_invites` row using the existing flow — no extra typing.

The location/activity tagging that already runs after `video.asset.ready` and after captions arrive stays unchanged; we just add a businesses pass and a small UI strip.

## What changes

### 1. New table — `video_business_suggestions`

Holds AI-detected businesses per video. One row per detection, kept until the creator dismisses it or converts it into an invite.

```
video_id            uuid    not null
name                text    not null       (e.g. "Aman Bali")
category            text                   (hotel | restaurant | tour | activity | bar | other)
city                text
country             text
website_guess       text                   (best-guess URL, may be null)
confidence          numeric                (0–1)
source              text                   ('transcript' | 'title' | 'description')
status              text    default 'pending'   ('pending' | 'converted' | 'dismissed')
converted_invite_id uuid                   (FK-like ref to business_invites.id)
detected_at         timestamptz default now()
primary key (video_id, name)
```

RLS:
- Creator of the video can read / update / delete their own rows.
- Service role inserts (from the AI pipeline).
- Admins can read all.

### 2. AI extraction (`src/lib/ai.functions.ts`)

Add a sibling helper `runBusinessExtraction(videoId)` that:
- Loads `title`, `description`, `transcript`, `city`, `country`, `thumbnail_url`.
- Skips if there is no transcript and the title/description are short (avoids hallucinating from a thumbnail alone).
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with a tight system prompt: *"Extract real-world businesses the creator mentions or visibly features. Reject generic nouns like 'the hotel' or 'a café'. For each, return name, category, best-guess city/country/website, and a confidence 0–1. Reply ONLY as JSON."*
- Validates with Zod (`z.array(...).max(8)`).
- Upserts into `video_business_suggestions` (skip if `status='dismissed'` already exists for the same name).

Trigger points (wire inside `runAutoTag` so we don't add new webhook plumbing):
- After the transcript-aware re-tag in `runAutoTag(..., { useTranscript: true })`, also call `runBusinessExtraction(videoId)`.
- Add `rerunBusinessExtraction` server fn (creator-only) for a manual "Re-scan" button.

### 3. Studio UI (`src/routes/studio.videos.$id.tsx`)

Above the existing **Businesses featured** list, add a "Suggested from this video" strip showing each pending suggestion as a chip with name + category + confidence dot. Per chip:
- **Tag** → opens the existing `TagBusinessSheet` pre-filled with `name`, `website_guess`, `city`, leaving contact email for the creator to add.
- **Dismiss** → marks `status='dismissed'`.

When the resulting invite is created, mark the suggestion `status='converted'` and stash `converted_invite_id` so it disappears from the strip. Empty state hidden when no suggestions.

Small server fns added in `src/lib/business-invites.functions.ts` (or a new `business-suggestions.functions.ts`):
- `listSuggestionsForVideo({ videoId })`
- `dismissSuggestion({ id })`
- `convertSuggestion({ id, contactEmail, contactPhone? })` — wraps `createBusinessInvite` and flips status.

### 4. `TagBusinessSheet` tweak

Accept optional `initial` props (`businessName`, `websiteUrl`, `city`) so the chip's **Tag** action can pre-populate the form. No other behavior change.

## Out of scope

- Auto-creating invites without a human tap (we want creator confirmation + contact email).
- Web-scraping the guessed websites to fetch real contact emails (separate follow-up that also benefits #1 discovery).
- Image/vision analysis of mid-roll frames — relies on transcript + metadata only for v1.
- Backfilling suggestions on historic videos (can be a one-off admin button later).

## Technical notes

- All AI calls remain in server functions; `LOVABLE_API_KEY` stays server-side.
- `runBusinessExtraction` is best-effort: failures are logged and never break the Mux webhook (`await` inside `try/catch`, same pattern as `runAutoTag`).
- Costs: one extra Gemini Flash call per video after captions land. Skipped when transcript + metadata are both empty/short.
- Reuses `business_invites` end-to-end — no change to the accept/decline flow or commission constants.

## Open question

For the pre-filled invite, should the suggestion's `website_guess` be treated as authoritative (creator just confirms), or always blank so the creator types/pastes the real URL? Default proposal: pre-fill but show a small "AI guess — verify" hint next to the field.
