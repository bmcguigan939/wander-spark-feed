## Update login/signup page background

Match the warm gradient + blurred colour blobs from the landing hero on the `/login` page (which is both sign-in and create-account).

### Change
**`src/routes/login.tsx`** — wrap the page in the same background treatment used in `LandingPage` Hero:
- Add `relative isolate overflow-hidden bg-background` to the outer container
- Add an `aria-hidden` layer with three blurred blobs using `--sunset`, `--coral`, `--twilight` tokens and the `animate-blob` class (same as Hero)
- Keep the auth card readable: give inputs/tab switcher a slightly more opaque `bg-card/80 backdrop-blur` so they sit nicely on the colourful backdrop

### Out of scope
- No changes to landing page, copy, or auth logic
- No new design tokens — reuse existing `--sunset` / `--coral` / `--twilight` and `animate-blob`
- Reset-password page (can mirror later if you want consistency)

Want me to apply the same treatment to `/reset-password` too?
