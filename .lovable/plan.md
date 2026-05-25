## Add Website URL editor to /admin/users

Let admins fix any business's `business_website_url` (and `business_name`) inline from the admin users list — the same field that drives the pink "Book direct" card on feed videos.

### Backend

`src/lib/admin.functions.ts`
- Extend `listAdminUsers` to also select `business_name` and `business_website_url` from `profiles`, so admins see them in the list.
- Add new server fn `setBusinessWebsite`:
  - Auth: `requireSupabaseAuth` + `assertAdmin`.
  - Input (Zod): `{ userId: uuid, businessName?: string|null (max 160), websiteUrl?: string|null (max 500) }`.
  - Validation: if `websiteUrl` is non-empty, normalize to absolute https URL, then reject via `isSelfHost()` (reuse `src/lib/url-guards.ts`) with message *"Enter the business's own booking website, not a travidz.com URL."*
  - Empty string → store `null` (clears the field, hides the Book-direct card).
  - Updates `profiles` for that user_id via `supabaseAdmin`.

### Frontend

`src/routes/admin.users.tsx`
- For each user row that has the `business` role (or already has a `business_name`), render a small "Business website" editor below the role chips:
  - Two compact inputs: Business name + Website URL, pre-filled from the user row.
  - "Save" button → calls `setBusinessWebsite` mutation; on success invalidates `admin-users` and toasts "Saved".
  - Inline error toast on validation failure (self-host rejection, etc.).
- Keep visual styling consistent with existing pill/input look in the file.

### Out of scope

- No schema migration (columns already exist on `profiles`).
- No change to feed `VideoCard` or `/api/public/b/$id` — the existing self-host guard there is sufficient.

### Files touched

- `src/lib/admin.functions.ts` — extend `listAdminUsers` select; add `setBusinessWebsite`.
- `src/routes/admin.users.tsx` — add inline website editor UI + mutation wiring.
