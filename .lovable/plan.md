## Goal

Keep the "Invite a business" sheet open while the creator switches apps, copies info, or interacts elsewhere on their device. Today it's a Radix Sheet that closes on any outside click, Escape key, or focus loss — so on mobile, opening the mail app or swiping to copy a website URL dismisses everything and wipes their progress.

## Changes (single file)

**`src/components/studio/TagBusinessSheet.tsx`**

1. Make the sheet "sticky" — only close via the explicit close (X) or Done button:
   - On `<SheetContent>`, add:
     - `onPointerDownOutside={(e) => e.preventDefault()}`
     - `onInteractOutside={(e) => e.preventDefault()}`
     - `onEscapeKeyDown={(e) => e.preventDefault()}`
     - `onOpenAutoFocus={(e) => e.preventDefault()}` (so focusing another input on the page doesn't yank focus back)
   - Keep the built-in X close button and the "Done" button as the only ways to dismiss.

2. Persist in-progress invite state across reloads / accidental closes using `sessionStorage` keyed by `videoId` (e.g. `travidz:invite-draft:<videoId>`):
   - Save `{ businessName, websiteUrl, city, contactEmail, contactPhone, step, inviteId, inviteToken, subject, body }` on change (debounced via `useEffect`).
   - On mount/open, hydrate from sessionStorage before falling back to `initial`.
   - Clear the entry when the user clicks Done or when an invite is successfully sent (mail opened).

3. Small UX nit: tighten the wording on the bottom helper to reflect that the sheet now stays open ("Switch apps to copy info — this stays open until you tap Done").

## Out of scope

- No backend, schema, or server function changes.
- No changes to how invites are created or emails drafted.
- Other sheets/modals in the app are untouched.
