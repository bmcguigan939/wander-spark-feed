## Plan

Fix the invite flow so a business invite cannot be accepted by the creator's currently logged-in account.

### 1. Server-side guard in `acceptInvite`
- Look up the signed-in user's email and compare it to the invite's `contact_email`.
- If they don't match, throw a clear error: "This invite was sent to {inviteEmail}. Please sign out and sign in (or sign up) with that email to accept it."
- Prevents Linda (or any other logged-in account) from silently claiming an invite addressed to a different business email.

### 2. Client-side warning on `/business/invite/:token`
- If the visitor is signed in as a different email than the invited business email, replace the "Accept & claim your listing" action with a destructive "Wrong account" panel showing both emails.
- Add a "Sign out" button so they can re-sign in with the correct invited email.
- After a correct accept, refresh user roles so the new `business` role is recognised immediately and the "Open your dashboard" button lands on `/business`.

### Why this fixes what you saw
The invite link was working, but the page trusted whichever session was active in the browser. Because Linda was already signed in, accepting the invite assigned the business listing to Linda's account and bounced the app back into her creator/profile context. With both the server check and the client warning in place, the invite can only be accepted by the email it was sent to — so the business lands in their own dashboard where they manage their shop front and accept future creator collabs.

### Out of scope
- Changes to business signup, login, or post-accept redirect targets.
