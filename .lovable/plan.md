# Feed fixes + emoji support

## Bug 1 — Comments sheet stuck on "Loading…"

Root cause: `src/lib/comments.functions.ts` imports the browser Supabase client and uses it inside `listComments`:

```ts
import { supabase as anon } from "@/integrations/supabase/client";
```

The browser client is configured for `localStorage` / `window` session persistence. On the TanStack server runtime (Cloudflare Worker) it fails at request time, so `listComments` rejects and React Query stays in `isLoading` forever. Every other public-read server fn in the project (`feed`, `destinations`, `deals`, `notifications`) uses `supabaseAdmin`.

Fix in `src/lib/comments.functions.ts`:
- Replace the `anon` import with `import { supabaseAdmin } from "@/integrations/supabase/client.server"`.
- Use `supabaseAdmin` in `listComments` only (comments are public read; existing RLS SELECT policy is `using (true)`).
- Leave `postComment` / `deleteComment` untouched — they correctly use `context.supabase` from `requireSupabaseAuth`.

## Bug 2 — No "back" affordance on Following tab

The Following / For-you pills at the top are the only switcher, and the Following empty state has no obvious way back. On mobile it reads as a dead end.

Fix in `src/routes/index.tsx`:
- In the Following empty-state branch, add a pill button **"Back to For you"** that calls `setTab("for-you")`.
- Extend `FullEmptyState` with an optional `action` slot so the button renders cleanly inside the existing card.

## Feature — Emoji support in comments

Fix in `src/components/feed/CommentsSheet.tsx`:
- Add a small emoji picker button (😊 icon, `Smile` from lucide) inside the comment input row, left of the Send button.
- On click, open a lightweight popover with a curated grid of ~40 travel-friendly emojis (🌴✈️🏖️🗺️🌍❤️🔥👏😍🤩🙌💯⭐🌅🏔️🐬🍹📸 etc.). Tapping inserts the emoji at the current cursor position in the input, then closes the popover and refocuses the input.
- Implementation: a tiny in-file component using `@/components/ui/popover` (already in shadcn). No new dependency — keep bundle small. The native OS keyboard already supports emoji entry on mobile, but the picker makes it one tap on desktop and discoverable on mobile.

## Feature — Emoji support in video upload

Fix in `src/routes/create.tsx` (the create/upload page):
- Add the same emoji picker control next to the **Title** and **Description** inputs (small Smile button at the field's right edge).
- Tapping inserts the emoji at the caret in that specific field.
- Extract the picker into `src/components/ui/emoji-picker.tsx` so both `CommentsSheet` and `create.tsx` import it (single source of truth, ~50 lines).

## Out of scope

- No schema, RLS, or auth changes.
- No third-party emoji library (e.g. `emoji-mart`) — keeps bundle lean and avoids SSR pitfalls. We can swap in a full picker later if the user wants search/skin tones.
- No changes to post/delete comment flow or to the realtime channel.
