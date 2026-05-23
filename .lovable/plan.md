## Goal

In the AI-drafted business invite email, include **links to the creator's social feeds** (primary ask) so the business can review their content directly. Also keep the creator's **follower count** in the email when it's easily available. Confirm creators can edit subject + body before sending (already supported by the review step).

## Changes

### 1. `src/lib/outreach.functions.ts` — `draftInviteEmail`

Replace the current "audience stats" data block with a social-links–first block. Keep follower count as a single optional line.

- Fetch in parallel:
  - `profile_socials` for the creator (`youtube_handle`, `youtube_channel_id`, `tiktok_handle`, `instagram_handle`, `x_handle`, `facebook_handle`, `website_url`, `show_social_links`).
  - `profiles.username` (for the Travidz profile URL `https://travidz.com/u/<username>`).
  - `follows` count for the creator (kept — cheap query, useful signal).
  - The video (`title`, `description`, `destination`, `cross_links`) — unchanged.
- Build a clean list of social URLs from the handles (only when `show_social_links` is true and the handle exists), e.g.
  - Instagram → `https://instagram.com/<handle>`
  - TikTok → `https://tiktok.com/@<handle>`
  - YouTube → channel URL if `youtube_channel_id` else `https://youtube.com/@<handle>`
  - X → `https://x.com/<handle>`
  - Facebook → `https://facebook.com/<handle>`
  - Plus the creator's Travidz profile URL.
- Drop the "last 10 videos views/likes" aggregate query and the per-video views/likes line — they were the noisy parts. Keep only follower count.
- Replace the `hasTraction` two-branch prompt with one direction: warm, content-first, "here are my channels — take a look at my work; I'd love to work with you on a commission basis through Travidz." Instruct the model to render the social links inline as a short labelled list (`Instagram: <url>`, etc.) so the business can click them.
- Fallback template: include the social-links block (when any are present) and the follower line (when > 0), alongside the existing offer + invite URL.

### 2. `src/components/studio/TagBusinessSheet.tsx`

- Step-2 `SheetDescription`: swap "using your following and this video's stats" → "with your follower count and links to your social feeds so the business can check out your content."
- Helper line under "Create invite & draft email": mention "Includes your follower count and links to your socials."
- Keep the existing editable `subject` input + `body` textarea — that already satisfies the "creators should be able to edit prior to sending" requirement. No structural changes to the review step.

## Out of scope

- No DB migrations (`profile_socials` and `follows` already exist).
- No changes to `draftApplicationReply`.
- No server-side sending; the `mailto:` flow stays so the business replies to the creator's own inbox.