# Why the page doesn't close & the deal card never appears

## What the data shows
- Every recent invite in `business_invites` is still `status = 'pending'` — including the Test 02 invite from your screenshot. That means **`acceptInvite` never reaches its final UPDATE**.
- Worker logs for the last hour show only GET server-fn calls (status reads, invite landings). There are **zero POST calls to `acceptInvite`**.
- Net effect: the button click either never fires the mutation, or it errors so early/silently that nothing reaches the server. With no DB write, there is no deal → no `matchedBusiness` → no card on the creator's video; and with no `onSuccess`, no toast and no `navigate({ to: "/business" })`.

So both symptoms have the same upstream cause. We need to (a) actually find out *why* the click is a no-op, and (b) make the success path land on the invite page itself instead of bouncing the user off to `/business`.

## Change

### 1. Make the failure observable (`src/routes/business.invite.$token.tsx`)
- Wrap the accept button in an `onClick` that logs `{ canAccept, agreed, websiteValid, websiteUrl, hasUser: !!user }` to the console *before* calling `acceptM.mutate()`. If `canAccept` is false, surface a `toast.error` saying which field is blocking (so the user stops getting a dead button with no feedback).
- In `acceptM.onError`, also `console.error("acceptInvite failed", e)` and `POST` the error to the existing `client_error_logs` insert path so it shows up in the dashboard. Today silent failures vanish.
- Add a tiny `onMutate` log so we can confirm in the network panel that a POST was actually issued.

### 2. Replace the redirect with an in-page success view
The current `onSuccess` calls `navigate({ to: "/business" })`, which (i) closes the invite context the business was just reading, (ii) sends them to a dashboard that's empty for a brand-new account, and (iii) gives no confirmation of *what* just happened.

Instead:
- On success, set local `accepted = true` (and also let the invite query refetch — it will return `status: "accepted"`).
- Render a new success card in place of the form: green check, "You're live on Travidz", the business name, and three actions:
  - **Open your dashboard** → `/business`
  - **See it on @{creator}'s video** → deep link to the video the invite came from (we already have `video.id` in `data`)
  - **Reply to {creator}** → scrolls to the existing thread block below
- Keep the existing `invite.status === "accepted"` early-return branch as the fallback for users returning to the link later.
- Remove the automatic `navigate(...)`. No redirect.

### 3. Make the deal card actually appear (`src/lib/business-invites.functions.ts` + feed cache)
Server-side, after the successful accept, also:
- Insert a `video_deals` row for *every* existing video by that creator in the same city as the invite (today we only attach to `invite.video_id`). That guarantees the auto-surfaced card isn't gated on the feed's city/country fallback finding a match.
- After the upsert into `creator_business_signings`, double-check `profiles.business_name` was actually written (handle the case where the profile row was created with NULL country and the matcher in `attachMatchedBusiness` falls through to the `list[0]` branch — it already does, so this is a sanity log only).

Client-side, on `onSuccess` also call:
```ts
qc.invalidateQueries({ queryKey: ["feed"] });
qc.invalidateQueries({ queryKey: ["video", data.video?.id] });
```
so if the business (or the creator viewing in another tab) opens the video, the card paints on next mount instead of after a stale-time window.

### 4. Add server-side guardrail logs in `acceptInvite`
Inside the `.handler`, wrap each external write in a `try/catch` that re-throws with a labelled message (`"accept: insert deals failed: ..."`, `"accept: upsert signing failed: ..."`). Right now any one of ~8 awaits can throw with a generic Postgres error and the client just shows `e.message`. Labelled errors will make the next failure self-diagnosing.

## Out of scope
- No schema changes.
- No change to who is allowed to accept (still requires auth + agreement + valid URL).
- No change to commission, payouts, or thread behaviour.

## Expected outcome
- Tapping Accept either succeeds (and you stay on the invite page with a green success card + link to the video) or shows a precise error toast + a logged entry — no more silent dead button.
- The "Book with {business}" card surfaces on the creator's video the moment the feed query refetches.
