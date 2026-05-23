## Goal
Re-enter the Mux credentials so the upload service stops rejecting requests.

## Steps
1. **Get a fresh token from Mux**
   - Mux dashboard → Settings → Access Tokens.
   - Confirm the correct **Environment** is selected at the top (this is the most common cause of the auth error).
   - Create a new Access Token with permission **Mux Video — Read & Write**.
   - Copy the **Token ID** and **Token Secret**.

2. **Update the secrets in Lovable Cloud**
   - I'll trigger the secure update prompt for `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET`.
   - You paste the new values into the form — they go straight into the backend, never into chat.

3. **Verify**
   - Reload the Create page and tap "Choose a video".
   - Expected: file picker proceeds and upload starts.
   - If it still fails with `MUX_AUTH`, the new token is likely from a different Mux Environment than expected — we'll regenerate from the correct one.

## Out of scope
- No code changes. No database/feed/search changes.
- Not switching providers.