## Goal
Let users set their own profile picture by tapping their avatar circle on the profile screen, picking an image, and having it upload and replace the avatar.

## Approach
The `avatars` storage bucket and RLS policies (path `<userId>/...`) already exist. The `updateMyProfile` server fn already accepts `avatar_url`. So this is a frontend-only change: add a tap-to-upload control overlaying the avatar in `src/routes/profile.tsx`.

## Changes

### `src/routes/profile.tsx`
- Wrap the avatar `<img>` (line 189) in a `<label>` with a hidden `<input type="file" accept="image/*">`, with a small camera-icon badge in the bottom-right corner of the circle indicating it's tappable.
- Add an `uploadAvatarM` mutation that:
  1. Validates type (image/*) and size (≤ 5 MB) — toast on failure.
  2. Uploads to `avatars` bucket at `${user.id}/${Date.now()}.${ext}` via `supabase.storage.from("avatars").upload(...)` with `upsert: true` and `cacheControl: "3600"`.
  3. Gets `publicUrl` via `getPublicUrl`.
  4. Calls `updateFn({ data: { avatar_url: publicUrl } })`.
  5. On success: invalidate `["my-profile"]`, toast "Profile photo updated".
- Show a small loading spinner over the avatar while uploading.
- Use existing `supabase` client (`@/integrations/supabase/client`) and existing `updateFn`/`Camera` icon (lucide-react).

No backend, schema, or RLS changes needed.
