## What's happening

That sheet is actually **Edit profile** (opened by the ⚙️ icon top-right). It holds three different things stacked together:

1. The real edit form — **Display name** + **Bio** + **Save**
2. **Sign out** button
3. **Contact support** and **Account & data** links

The screenshot you saw shows the bottom of that sheet, which is why "Display name" and "Bio" look like they belong on a "sign out page" — they don't, they're the profile editor.

The native "Sign out of Travidz?" popup is `window.confirm(...)` in `handleSignOut`.

## Plan

**1. Remove the confirm popup** (`src/routes/profile.tsx`, `handleSignOut`)
Delete the `window.confirm(...)` guard. Tapping **Sign out** signs you out immediately.

**2. Rename the sheet so the fields make sense**
Rename the sheet title from **"Edit profile"** → **"Profile & account"**, and group it into two clear sections inside the same sheet:

- **Edit profile** — Display name, Bio, Save
- **Account** — Sign out, Contact support, Account & data

Small heading above each section (same `text-xs uppercase tracking-wide text-muted-foreground` style already used elsewhere) so it's obvious why the editor and the sign-out button live together. The ⚙️ gear icon already implies "settings", and keeping one sheet avoids adding a second menu surface on mobile.

## Out of scope

- No change to what Save does, no schema changes, no new routes.
- Not splitting into two separate sheets — the gear is the only top-right entry point and adding a second would clutter the header.

## Result

- Tap **Sign out** → you're signed out, no popup.
- The sheet is clearly labelled so Display name / Bio are obviously the profile editor, and Sign out / Contact support / Account & data are obviously the account actions.