## Security fixes — round 4

### 1. ERROR — Bookings PII leak to business accounts
Business users (`auth.uid() = business_id`) currently SELECT entire `bookings` rows including traveller `customer_name` / `customer_email`. Travidz attribution flows already serve business-side data through server fns with safe column projections, so direct table access can be tightened.

Migration:
- `REVOKE SELECT (customer_name, customer_email, notes) ON public.bookings FROM authenticated;`
- Keep `bookings business read` policy (business still needs row visibility for IDs, status, dates, amounts).
- `bookings admin all` and the customer's own SELECT (`auth.uid() = user_id`) keep full access via the `postgres`/admin path and via the customer's own column GRANTs (no change needed — customer is the row's user, gets full row via policy + default GRANT on remaining columns; we only strip the two PII columns from `authenticated` BASE GRANT, which also blocks the customer reading their own name/email from the client).

Because the strip is column-wide, also expose a server fn `getMyBookingContact` that reads `customer_name` / `customer_email` via `supabaseAdmin` for the authenticated customer (`user_id = auth.uid()`) so the traveller's own UI still shows their contact details. Audit existing callers of `bookings` in client code; any that select these columns must route through a new server fn (`getBusinessBookings`) that uses `supabaseAdmin` with explicit business-side column allowlist (omitting PII).

### 2. WARN — Collections server fns missing ownership predicate
`src/lib/collections.functions.ts`:
- `updateCollection` → add `.eq("owner_id", userId)` to the `.update().eq("id", id)` chain.
- `deleteCollection` → add ownership check before deleting items + collection (either a precondition SELECT or `.eq("owner_id", userId)` on the final delete; the `collection_items` delete is fine since it's gated by the parent delete failing).
- `addToCollection` / `removeFromCollection` → precondition: verify the target collection's `owner_id = userId` before the upsert/delete.

Defense-in-depth: keeps RLS as the second layer, server fn as the first.

### 3. WARN — `business_invites.contact_phone` exposed to inviting creator
Migration: `REVOKE SELECT (contact_phone) ON public.business_invites FROM authenticated;` — admins keep access via service role. If the creator UI needs to show phone, add a server fn that returns it only for admin role.

### 4. WARN — `business_agreement_acceptances.ip` (GDPR personal data)
Migration: `REVOKE SELECT (ip, user_agent) ON public.business_agreement_acceptances FROM authenticated;` — admins keep audit access via service role / `admin read all acceptances` policy + `postgres` grants.

### 5. Verification
- Re-run `security--run_security_scan`; expect 0 ERROR, the 3 WARNs gone.
- Smoke test: business dashboard still lists bookings (without PII), traveller still sees their own contact info via the new server fn, creator invite UI still works without phone column, agreement acceptance flow still writes IP server-side.
- Update security memory: note the column GRANT strips and the bookings PII server-fn pattern.

### Files / migrations
- New migration: column REVOKEs for `bookings` (customer_name, customer_email, notes), `business_invites.contact_phone`, `business_agreement_acceptances.ip` + `user_agent`.
- Edit `src/lib/collections.functions.ts` — add ownership predicates to 4 handlers.
- New server fn (likely in `src/lib/booking.functions.ts`) — `getBusinessBookings` and `getMyBookingContact` using `supabaseAdmin` with column allowlists.
- Audit & update any client component that selected the now-revoked columns directly (likely under `src/routes/_authenticated/business/**` and `src/routes/_authenticated/bookings/**`) to call the new server fns instead.
