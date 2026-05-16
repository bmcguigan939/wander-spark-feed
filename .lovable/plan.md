## Goal

Drive one real user through the full pipeline, find what breaks, fix it. No new features.

## What I'll exercise (in order)

1. **Signup** — create a fresh account on `/login`. Verify `profiles` + `user_roles` rows auto-created by `handle_new_user` trigger.
2. **Become creator** — call the existing "become a creator" flow from `/profile`. Verify `user_roles` gets a `creator` row.
3. **Upload** — go to `/create`, pick a short local clip, post it.
   - Watch the `getMuxUpload` server fn create a direct upload.
   - Watch the browser `PUT` to Mux's `uploadUrl` succeed (CORS is the usual failure here).
   - Confirm a `videos` row appears with `status='pending'`.
4. **Webhook** — wait for Mux to fire `video.upload.asset_created` → `video.asset.ready`.
   - Confirm `status` flips to `ready`, `mux_playback_id`, `thumbnail_url`, `duration_sec` populate.
5. **AI auto-tag** — confirm the post-webhook Gemini call writes back `country`, `city`, `destination`, `activity_tags`, `budget_tag`. Inspect server-function logs if it silently no-ops.
6. **Feed** — `/` should render the new video, autoplay-on-scroll, MapPin chip links to `/destinations/$country[/$city]`.
7. **Interactions** — like, save, +Collection (create + add), share. Verify counters bump and `likes`/`saves`/`collection_items` rows land.
8. **Destinations** — `/destinations` lists the country; clicking through shows the video.
9. **Profile + follow** — `/u/$username` shows the video + working Follow button (sign in as a second test user to verify follower count increments).
10. **Search** — `/search` returns the video by title and the creator by username.

## How I'll run it

- Use the browser tool against the preview to drive signup, upload, and the UI flows.
- **The upload step needs a real video file.** I cannot upload from the sandbox into the preview's `<input type="file">`. You'll need to either:
  - (a) drive the upload yourself in the preview while I watch network + DB, or
  - (b) let me skip the manual UI upload and instead simulate it by inserting a `videos` row + replaying a sample Mux `video.asset.ready` webhook payload against `/api/public/mux-webhook` with a valid signature. That covers everything past the Mux PUT, but does not validate the browser-to-Mux CORS path.
- Use `read_query` to inspect DB state after each step.
- Use `server-function-logs` for the AI tag + webhook handler.

## Likely failure points (so we have a fix list ready)

- Mux direct-upload CORS — likely needs `cors_origin: "*"` or the preview origin set on `getMuxUpload`.
- Webhook signature parsing if Mux sends extra `,` segments — current parser is strict.
- AI tag fetch failing silently (gateway 429/402 or schema parse) — already logs, just needs eyes.
- `handle_new_user` trigger username collision on quick re-signups.
- TanStack `<Link>` typing on `/destinations/$country/$city` if params arrive lowercase vs DB casing (we `ilike` server-side so lookup works, but URL casing in the chip uses the raw DB value — minor).

## Deliverable

A pass/fail summary per step, plus any patches applied. After this, Phase 2 polish (captions, nav entry) or Phase 3 (Deals) becomes safe to start.

## What I need from you to start

Pick one:
- **(a) Manual upload** — you log in to the preview, hit Create, upload a short clip. I'll watch and fix.
- **(b) Simulated upload** — I seed a video row and replay a Mux webhook to validate everything past the browser→Mux PUT.
