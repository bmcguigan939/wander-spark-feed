## Plan

Fix the invite flow so a business invite cannot be accepted by the creator’s currently logged-in account.

### 1. Add account mismatch protection on the invite page
- If someone opens `/business/invite/:token` while logged in as a different email than the invited business email, show a clear warning.
- Do not show the “Accept & claim your listing” action for that wrong account.
- Add a button to sign out and continue with the invited business email.

### 2. Route invited businesses to the right auth path
- If the invite email already has an account, send them to login with the invite return path.
- If the invite email has no account, send them to business signup with the invite token.
- Preserve the requirement to tick the business agreement checkbox before continuing.

### 3. Harden the server-side accept action
- Update `acceptInvite` so it checks the logged-in user’s email matches the invite’s `contact_email` before it creates the business role, deal, signing, and dashboard data.
- If the wrong account tries to accept, return a helpful error instead of silently assigning the invite to that account.

### 4. Refresh roles and send them to the business dashboard after acceptance
- After a correct accept, refresh the user roles so the app recognises the business role immediately.
- Keep the “Open your dashboard” button pointing to `/business`, where the business manages shop front setup, creator messages, creator applications/collabs, and bookings.

### Why it is not working now
The invite link itself is reaching the invite flow, but the page currently trusts the active browser session. Because Linda was already logged in, clicking “Approve your listing” accepted the invite under Linda’s account, which then made the app show Linda’s creator/profile context instead of the intended business account.