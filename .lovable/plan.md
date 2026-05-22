## What's happening

The `/admin/users` page already exists (it's the "Users" tab in the admin nav) and lets you search users, grant/revoke roles (creator, business, admin), and verify accounts. The Overview just doesn't link to it — the "12 users" card is plain text.

## Change

Make the stat cards on `/admin` (Overview) clickable so each one jumps to the right management page.

| Card | Goes to |
|---|---|
| Users, Creators, Businesses, Verified biz | `/admin/users` |
| Videos live, Pending videos, Hidden videos | `/admin/videos` |
| Active deals, Pending apps | `/admin/deals` |
| Mod flags | `/admin/moderation` |

Marketplace money cards (GMV, Commission, etc.) stay non-clickable — they're summary numbers, not lists.

## Technical detail

One file: `src/routes/admin.index.tsx`. Add a `to?` prop to the `Stat` component; when present, render the card as a `<Link>` with a subtle hover state instead of a plain `<div>`. Add typed route paths so TanStack Router's strict types stay happy.

Switch to build mode and I'll apply it.
