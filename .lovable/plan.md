## Status

The original 5-step roadmap is fully shipped:

- Step 1 — Mux upload + creator role ✅
- Step 2 — Mux Player + caption toggle ✅
- Step 3 — Feed + interactions (like/save/share/collections) ✅
- Step 4 — AI auto-tag on upload ✅
- Step 5 — Transcript-driven re-tagging ✅ (just landed)

Nothing in `.lovable/plan.md` is pending. So "next step" is now a product question, not a checklist question.

## Recommended next moves (pick one)

Three directions worth doing next, in rough priority order:

### A. Verify Step 5 end-to-end (1 small task, do this first)
Before stacking new work, confirm the transcript pipeline actually fires in production:
- Upload a fresh test video, wait for `video.asset.track.ready`, check `videos.transcript` populates and tags improve.
- Add a small `console.log` audit in the webhook around the VTT fetch so we can debug from logs if it doesn't.

### B. Make the transcript visible & useful (small, high-leverage)
The data is sitting in the DB unused outside tagging. Two cheap wins:
1. **Transcript-powered search** — extend `videos_update_search_tsv` trigger to include `transcript` (weight D). Search quality jumps immediately, no UI change needed.
2. **Manual "Re-run AI tagging" button** on the creator's own video page — calls existing `autoTagVideo` serverFn. Useful when auto-tag misses.

### C. Comments (medium, user-facing feature)
The feed UI already has a comment button that toasts "coming soon". Building it is:
- `comments` table (id, video_id, user_id, body, created_at, parent_id nullable)
- RLS: public read, auth insert, owner delete
- `comment_count` on videos + trigger (mirrors like/save pattern)
- Comments sheet component (reuses `AddToCollectionSheet` shape)

### D. Business analytics depth (medium)
Business dashboard currently shows sparklines of click volume. Natural next step:
- Per-deal funnel: impressions (when a video with matched deal is viewed) → clicks → outbound URL hits.
- Requires logging deal impressions in `VideoCard` when `active` becomes true.

## My recommendation

Do **A then B1** in one short turn (verify Step 5, then add transcript to search_tsv — ~15 lines of SQL). Then pick **C (comments)** as the next real feature, since it's the most visible gap in the user-facing app.

Want me to proceed with A + B1, or jump to C?