## Why uploads currently look broken

I traced the full path. The bucket, RLS policies, and server-side profile update are all wired correctly:

- `avatars` bucket exists and is public.
- Storage policies allow `auth.uid()/...` uploads/updates/deletes.
- `profiles` RLS allows self update.
- Recent `updateMyProfile` change already throws a real error if the row update returns no row.

So the user-visible failure is almost certainly happening at the **client-side storage upload step** in `src/routes/profile.tsx` (`uploadAvatarM`). The most common silent failure modes there are:

1. The browser's Supabase session JWT is stale/refreshed mid-call, so the `storage.objects` INSERT policy rejects the upload — error is shown as a toast and then forgotten.
2. The public URL succeeds, but the `updateMyProfile` call is rejected by zod or RLS, and the toast disappears too fast for the user to read.
3. The `<img>` keeps the previous `src` because the React Query cache rehydrates with the same row before the new avatar URL lands.

There is no server-side observability today — `console.error` is not called, and the server function is never reached if the storage step fails. That's why "it just doesn't save."

## Fix plan

Move the upload to the trusted server boundary so it can't be defeated by a stale JWT, and make the failure mode loud.

### 1. New server function `uploadMyAvatar`

File: `src/lib/profile.functions.ts`

- `createServerFn({ method: "POST" })` with `requireSupabaseAuth`.
- Input: `{ contentType: string; dataBase64: string }` validated with zod (max ~7 MB after base64 inflation, content type must start with `image/`).
- Handler:
  - Decode base64 into a `Uint8Array`.
  - Use `supabaseAdmin.storage.from("avatars").upload(\`${userId}/${Date.now()}.${ext}\`, bytes, { contentType, upsert: true })`.
  - Get the public URL.
  - `supabaseAdmin.from("profiles").update({ avatar_url }).eq("id", userId).select("id").maybeSingle()` — throw if no row.
  - Return `{ avatar_url }`.
- Import `supabaseAdmin` inside the handler with `await import("@/integrations/supabase/client.server")` so it never leaks into client bundles.

### 2. Rewire `uploadAvatarM` in `src/routes/profile.tsx`

- Replace the direct `supabase.storage.from("avatars").upload(...)` flow with a call to the new `uploadMyAvatar` server fn via `useServerFn`.
- Convert the picked `File` to base64 with `FileReader` before invoking.
- Keep the 5 MB / image-only guards on the client for fast feedback.
- On success, set the returned `avatar_url` directly into the React Query cache (`qc.setQueryData(["my-profile"], …)`) in addition to invalidating, so the image swaps instantly with no race against refetch.
- On error, log the full error to `console.error` and show the real message in the toast (not a truncated one).

### 3. Bust the `<img>` cache after a fresh upload

In the avatar `<img>` at line 219, append `?v=${encodeURIComponent(p.avatar_url ? '' : '')}` style cache-buster only when the URL just changed. Simplest: append `?t=${Date.now()}` once, stored in state and reset after upload. This guarantees the user sees the new picture even if a CDN cached the previous one at the same path.

### 4. Leave the existing client-side bucket path in place but unused

We don't need to delete the `avatars` bucket policies — they remain a valid backup. The UI just stops depending on them.

## Out of scope

- Storage bucket changes (none needed).
- `updateMyProfile` changes (last turn's fix stays).
- Any unrelated security findings from the current scan view.

## Verification

After implementing:
1. Sign in as a normal user, pick a JPG → toast says "Profile photo updated" and the avatar visibly changes within ~1s.
2. Pick a 6 MB file → client-side toast: "Image must be under 5 MB" (no network call).
3. Pick a `.txt` renamed to `.jpg` → server rejects with "Please upload an image"; toast surfaces it.
4. Server logs (`stack_modern--server-function-logs` filtered by `uploadMyAvatar`) show a clean 200 on success and a clear error on failure — so we can debug the next report instead of guessing.
