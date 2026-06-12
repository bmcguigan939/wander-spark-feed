## Goal
On the feed, deals/details panel under each video should stay collapsed while users scroll. If they like a video, it auto-expands so they can browse deals. They can still toggle Show/Hide manually.

## Changes (single file: `src/components/feed/VideoCard.tsx`)

1. **Default state = collapsed**
   - Change the `collapsed` initial value so new sessions start collapsed (`true`), instead of expanded.
   - Keep reading/writing the session preference so a manual Hide/Show choice persists across cards in the same scroll session.

2. **Auto-expand on Like**
   - In the `likeM` mutation's `onMutate`, when the user is liking (not unliking), call `setCollapsed(false)` and also update sessionStorage so subsequent cards stay expanded until the user manually hides again.
   - No change on unlike.

3. **No other UI changes**
   - The existing "Show deals / Hide" pill button and chevron stay exactly as they are.
   - Follow button + title + cross-links + attached deals all continue to live inside the `!collapsed` block.

## Out of scope
- No backend, schema, server-function, or query changes.
- No styling redesign of the collapsed header row.
