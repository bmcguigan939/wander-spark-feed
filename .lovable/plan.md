## Step 5: Transcript-driven re-tagging — DONE

Now that Mux auto-captions are wired up (Step 2), we can use the finished transcript to produce better city/country/activity tags than the creator's manual title alone.

### Scope

1. **Schema** — add `transcript TEXT` column to `videos` (nullable). `captions_ready BOOLEAN` already exists from Step 2.

2. **Fetch transcript on `video.asset.track.ready`** in `src/routes/api/public/mux-webhook.ts`:
   - When `track.type === "text"` and `status === "ready"`, fetch the WebVTT from `https://stream.mux.com/{playback_id}/text/{track_id}.vtt`.
   - Strip VTT timestamps/cues down to plain text.
   - Store on `videos.transcript`, set `captions_ready = true`.
   - Then call `runAutoTag(videoId, { useTranscript: true })`.

3. **Upgrade `runAutoTag`** in `src/lib/ai.functions.ts`:
   - Accept optional flag; when true, include the transcript in the LLM prompt alongside title/description.
   - Keep the existing JSON-schema response (country/city/activity_tags/budget_tag).
   - Only overwrite fields the creator hasn't manually set (preserve human edits made between upload and transcript-ready).

4. **Re-run deal matching** after tags update — reuse whatever the existing `runAutoTag` flow already triggers; no new code path.

### Out of scope

- Exposing transcript text in the UI (search/captions display).
- Multi-language transcripts.
- Manual "re-run AI" button.

### Technical notes

- Mux WebVTT URL is public (same playback policy as the video) — no signed URL needed for public playback.
- VTT parsing: strip `WEBVTT` header, timestamp lines (`00:00:00.000 --> ...`), and blank lines; join remaining text.
- Webhook handler stays under the 30s Worker budget — transcript fetch + LLM call is sequential but small.
- "Preserve human edits" check: only update a field if the current DB value equals what `runAutoTag` previously wrote (or is null). Simplest version: skip update if the creator has touched `finalizeVideoMetadata` after upload — track via `metadata_edited_at` or just check whether values are non-null.

### Files touched

- `supabase/migrations/<new>.sql` — add `transcript` column
- `src/routes/api/public/mux-webhook.ts` — fetch + store transcript, trigger re-tag
- `src/lib/ai.functions.ts` — accept transcript input
- `.lovable/plan.md` — mark Step 5 done

Say the word and I'll implement.