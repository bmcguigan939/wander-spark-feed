## Stop the AI outreach email from inventing video details

### What's actually happening

In the screenshot the email reads *"I recently featured your wonderful shepherd's hut in a short video (EE0D3243-0958-482A-BB9F-BA05FFC4A9F5)."*

Two problems, both in `src/lib/outreach.functions.ts` → `draftInviteEmail`:

1. **The "title" is a raw UUID.** Linda's video has no proper title, so `video?.title` is the video's ID (`EE0D3243-…`). We pass it to the model as `Video title: EE0D3243-…` and it lands verbatim in the body — looks broken and unprofessional.
2. **The model hallucinated "shepherd's hut".** Given only a UUID + business name "East Dean Estate", Gemini guessed what the video might be about. Our system prompt says *"Mention specific details from the video when helpful"* but never says *"don't invent any"*. The model fills the gap with a plausible-sounding lie.

### Fix (single file: `src/lib/outreach.functions.ts`)

**1. Sanitize the inputs before sending to the model**
- Detect a UUID / id-shaped string and treat it as "no title". A title is only passed in if it looks like real human text (not a UUID, not empty, not just the video ID).
- Build a small `videoContext` object with only the fields we actually trust: human title (optional), destination (optional), description snippet (optional). Drop anything missing rather than passing empty placeholders.
- Never include the video ID anywhere in the prompt or body.

**2. Tighten the system prompt against hallucination**
- Add explicit anti-fabrication rules:
  - "Do NOT describe what is in the video, the property type, the activities, the scenery, the season, or any sensory detail unless it is explicitly stated in the data provided below."
  - "If no video title or description is provided, write a generic line like 'I recently featured you in a short video on Travidz' — do NOT guess what the video shows."
  - "Never include IDs, UUIDs, file names, or codes in the email body."
- Keep the existing banned-phrase list and follower/socials/CTA structure unchanged.

**3. Update the fallback (`fallbackInviteDraft`) to match**
- When `videoTitle` is missing/UUID-shaped, use *"I recently featured you in a short video on Travidz"* instead of `"...in my Travidz video \"<uuid>\""`. This keeps the non-AI path safe too.

### Out of scope
- No DB changes. No UI changes to the "Review your email" sheet — the user can still edit before sending.
- Application-reply drafts (`draftApplicationReply`) aren't affected and won't be touched.
- We don't try to auto-generate a title for the video; that's a separate feature.

### Why this fixes the user's concern
After this change, with the same inputs Linda would see something like:

> Hi East Dean Estate team,
> I'm Linda — I recently featured you in a short video on Travidz and travellers have been asking how to book with you directly. …

No invented shepherd's hut, no UUID in the body, and the model is constrained from improvising about content it can't see.
