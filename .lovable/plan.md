## Plan

1. **Stop the avatar from being clipped**
   - Remove the upward overlap that pulls the avatar into the header area.
   - Keep the slim gradient header as a top strip, but make the profile identity row start safely below it.

2. **Tighten the profile top spacing**
   - Reduce the gap under the strip so the page still feels compact.
   - Keep the avatar, username, and display name visually dominant without colliding with the strip.

3. **Preserve the rest of the profile UI**
   - No changes to buttons, tabs, data loading, or backend logic.
   - Only update `src/routes/profile.tsx` layout classes around the header/avatar row.

## Technical details

Current issue: the avatar has `-mt-8`, which intentionally pulls it upward into the 56px header strip. Because the header uses `overflow-hidden`, the avatar’s top edge visually gets cut off. The fix is to remove that negative margin and use normal vertical spacing below the strip.