# Fix right-rail action buttons

## What's actually broken

A single Like insert is currently being counted **twice** because the database has two identical triggers on every counter table. Same issue affects Save (Bookmark) and Comment counts, plus notifications fire twice.

Duplicate triggers found on the database:

| Table    | Trigger A           | Trigger B (duplicate)    | Function                    |
|----------|---------------------|--------------------------|-----------------------------|
| likes    | trg_likes_count     | trg_likes_bump           | bump_video_like_count       |
| saves    | trg_saves_count     | trg_saves_bump           | bump_video_save_count       |
| comments | comments_bump_count | trg_comments_bump        | bump_video_comment_count    |
| likes    | trg_notify_like     | trg_notify_on_like       | notify_on_like              |
| comments | trg_notify_comment  | trg_notify_on_comment    | notify_on_comment           |
| comments | comments_touch_updated_at | trg_comments_touch_updated_at | touch_updated_at     |

That's why:
- Heart: 0 → **+2** on click, click again → **−2** back to 0 (toggle logic is fine, count is double-counted).
- Comment: posting 1 comment shows **2**.
- Bookmark: same +2/−2 behavior (it does work, but the count makes it look wrong).

The Share button itself does work, but in the Lovable preview iframe `navigator.share` is blocked and `navigator.clipboard.writeText` can silently reject without a toast, so it looks dead.

## Fix

### 1. Migration — drop the duplicate triggers (keep one of each)

```sql
DROP TRIGGER IF EXISTS trg_likes_bump ON public.likes;
DROP TRIGGER IF EXISTS trg_saves_bump ON public.saves;
DROP TRIGGER IF EXISTS trg_comments_bump ON public.comments;
DROP TRIGGER IF EXISTS trg_notify_on_like ON public.likes;
DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
DROP TRIGGER IF EXISTS trg_comments_touch_updated_at ON public.comments;
```

### 2. Migration — reconcile existing inflated counts

Recompute `like_count`, `save_count`, `comment_count` on `videos` from the source tables so today's doubled numbers settle back to reality:

```sql
UPDATE public.videos v SET
  like_count    = COALESCE((SELECT count(*) FROM public.likes    WHERE video_id = v.id), 0),
  save_count    = COALESCE((SELECT count(*) FROM public.saves    WHERE video_id = v.id), 0),
  comment_count = COALESCE((SELECT count(*) FROM public.comments WHERE video_id = v.id), 0);
```

### 3. `src/components/feed/VideoCard.tsx` — harden Share fallback

Update `share()` so the clipboard path is wrapped in try/catch and falls back to a manual "copy this link" toast when both `navigator.share` and `navigator.clipboard` are unavailable/blocked (preview iframe case). Also show a success toast after a real Web Share completes.

## Out of scope

- No changes to the toggle/server-fn logic — it's correct.
- No schema changes beyond dropping the duplicate triggers and the one-time count reconcile.
- No UI redesign of the right rail.
