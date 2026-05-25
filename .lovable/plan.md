# Launch + scale-ready sprint

Goal: lock in the three highest-impact items now (#9, #7, #10), then sweep the rest of the checklist so Travidz can absorb a traffic spike at launch without breaking or burning cash.

## 1. Mux delivery cost guardrails (#9)

File: `src/lib/mux.functions.ts` (in `createDirectUpload`).

- Add `max_resolution_tier: "1080p"` to `new_asset_settings` so creators can't push 4K masters that 10x our storage + delivery bill.
- Keep `video_quality: "basic"` (already set) — confirms HLS adaptive bitrate ladder, no MP4 renditions.
- Add `mp4_support: "none"` explicitly so nobody can hot-link the source MP4 and bypass HLS/CDN.
- No DB changes. Only affects new uploads (existing assets unchanged).

This is the single biggest lever on the £300k-£500k Y5 infra line.

## 2. Rate-limit audit (#7)

Today `checkRateLimit` is only wired into `comments.functions.ts` and `redemptions.functions.ts`. Add it to the abuse-prone surfaces:

Server functions (per-user, sliding window):
- `mux.functions.ts` → `createDirectUpload` — 10/min, 50/hour (prevents upload-spam → Mux ingest cost).
- `mux.functions.ts` → `reconcileMyStuckUploads` — 5/min (hits Mux API in a loop).
- `itineraries.functions.ts` → create/save flows — 30/min.
- `destinations.functions.ts` → write paths — 30/min.
- `profile.functions.ts` → profile update — 20/min.

Public HTTP routes (per-IP, since no userId):
- `routes/api/public/b.$id.ts`, `d.$id.ts`, `go.$id.ts`, `r.$code.ts` — 120/min per IP (click/redirect endpoints; easy DoS target).
- `routes/api/public/attribute.ts` — 60/min per IP.
- `routes/api/public/mux-webhook.ts` — do NOT rate limit; rely on signature verification.

Add a small `getIpKey(request)` helper in `rate-limit.server.ts` reading `cf-connecting-ip` / `x-forwarded-for`.

## 3. CDN caching headers (#10)

Public read pages that are safe to cache at the edge:

- Public deal pages (`/d/:id` route + deal landing): `Cache-Control: public, s-maxage=60, stale-while-revalidate=600`.
- Public profile pages (`/u/:handle` or equivalent): same.
- Public video share pages: `s-maxage=30, stale-while-revalidate=300` (feed freshness matters more).
- Leave `no-store` on redirect endpoints (`b.$id`, `go.$id`, `r.$code`, `d.$id`) — already correct.
- `sitemap.xml` and `robots.txt` already cached — no change.

Implementation: set `Cache-Control` in the route's `head()`/response in TanStack server routes, and add `<meta http-equiv="Cache-Control" ...>` is NOT used — caching is response-header driven, so we set it on the document response where possible. For SSR pages, set via the route's `loader` returning headers on the Response.

## 4. Sweep of remaining items

After the above ships, run a quick readiness pass and report status — no code changes unless something is missing:

- **#1 Cloud instance size** — check current size vs MAU forecast; recommend bump if on Micro.
- **#2 DB hardening** — run `supabase--linter` and `security--run_security_scan`; fix any criticals (missing RLS, hot-path indexes on `videos.published_at`, `feed_*` queries).
- **#3 Mux production keys** — verify `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` are live keys (check via `secrets--fetch_secrets` listing only).
- **#4 Email domain** — `email_domain--check_email_domain_status` for `notify.travidz.com`.
- **#5 Stripe live mode** — `payments--get_go_live_status`.
- **#6 Backups** — confirm `docs/backup-restore-drill.md` exists and is current.
- **#8 Realtime publication** — query `supabase_realtime` for tables; flag any not needed.
- **#11 Observability** — confirm `/admin/errors` exists; recommend external uptime monitor (UptimeRobot/Better Stack).
- **#12 Cloud usage alerts** — note: must be set in Cloud UI; flag to user.

Items #13-#17 are "at scale" — note them but defer until MAU climbs.

## Deliverable

A single follow-up message after implementation with:
- ✅ what shipped (#9, #7, #10)
- 🟡 what needs your action in the Cloud / Stripe / Mux UIs
- 🔴 anything blocking launch

## Out of scope

- No new tables, no schema migrations (rate-limit table already exists).
- No changes to billing/commission logic.
- No frontend visual changes.
- Items #13-#17 (read replicas, cold storage, image CDN) deferred until traffic warrants.
