# Stop making users tap "Refresh status"

## Problem

Today, when a video is processing, two things are supposed to update the UI automatically:

1. The Mux webhook (`/api/public/mux-webhook`) flips `videos.status` to `ready` when Mux finishes encoding.
2. The realtime subscription (`useRealtimeMyVideos`) invalidates the studio query so the list re-renders instantly.

In practice, users still sit on the Videos tab watching a "Processing" pill and have to tap **Refresh status** to nudge it. That can happen for legitimate reasons (webhook delay, transient failure, dropped realtime socket on mobile, app backgrounded during the webhook fire). The realtime/webhook path is the fast path — we just need a reliable fallback so the UI eventually catches up on its own.

## Fix

Add automatic background polling on the Studio Videos page whenever there is at least one processing video. Keep the manual button as a safety net but rephrase the copy so it no longer reads like a required action.

### Behaviour

- While `counts.processing > 0`:
  - Refetch the `studio-videos` list on an interval (10s, backing off to 30s after a minute, capped at 60s).
  - Every other tick, also call `reconcileMyStuckUploads` silently (no toast) so Mux is actively queried for stuck uploads — this is what the button does today.
  - Pause polling when the browser tab is hidden (`document.visibilityState === "hidden"`), resume on focus. This avoids burning battery / quota on backgrounded mobile tabs.
  - Stop polling as soon as `counts.processing === 0`.
- Realtime subscription stays as-is — it remains the instant path when the webhook fires normally.
- The processing banner is reworded to: "Checking for updates automatically…" with a small spinner. The explicit "Refresh status" button is kept (collapsed into an icon-only button) for users who want to force a check; it still surfaces toasts as today.

### Files touched

- `src/routes/studio.videos.tsx` — add the auto-poll effect, rewire the banner copy, keep the manual button as a secondary action.

No server, schema, or webhook changes. Frontend-only.

## Out of scope

- Diagnosing why the Mux webhook occasionally lags (separate investigation; would require checking `MUX_WEBHOOK_SECRET` config and Mux dashboard delivery logs).
- Push notification when a video goes live (already partially handled via the realtime toast in `useRealtimeMyVideos`).
