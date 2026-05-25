## Fix login form on mobile keyboards

Two small UX issues on `/login` (visible in the screenshots):

1. When the on-screen keyboard opens, it covers the password input so users can't see what they're typing.
2. The password field has no way to reveal what's been typed.

### Changes (all in `src/routes/login.tsx`)

**1. Keep the form visible above the keyboard**
- Replace the `justify-center` full-height layout with a top-aligned layout that has comfortable top padding instead of vertical centering. That way when the keyboard pushes the viewport up, the email + password inputs stay in view (centered layouts get clipped because the centered content sits behind the keyboard).
- Tighten the header spacing (logo + "Travidz" + tagline) so the inputs sit higher on the initial screen too.
- Add `scroll-margin-top` to the inputs and an `onFocus` `scrollIntoView({ block: 'center' })` on the password input as a belt-and-braces fix on iOS Safari, which doesn't always auto-scroll focused inputs above the keyboard.

**2. Add a show/hide eye toggle to the password field**
- Wrap the password `<input>` in a relative container.
- Add a button positioned at the right edge of the input that toggles `showPassword` state between `type="password"` and `type="text"`.
- Use `Eye` / `EyeOff` icons from `lucide-react` (already used elsewhere in the project).
- Give the button an `aria-label` ("Show password" / "Hide password") and `aria-pressed` for accessibility, and bump padding-right on the input so the typed text doesn't run under the icon.

### Out of scope

- No change to the reset-password page (can add the same toggle there in a follow-up if you want — let me know).
- No change to auth logic, validation, or styling tokens.
