
## Close the remaining ERROR-level data exposure findings

Three targeted changes — one migration + two small code edits — drop the 2 ERRORs and 2 WARNs in the deferred bucket.

### Approach: column-level GRANT (not policy rewrite)

Postgres RLS is row-based, not column-based. To restrict which columns anon/authenticated can read without rewriting every call site to a view, we:

1. `REVOKE SELECT ON <table> FROM anon, authenticated`
2. `GRANT SELECT (col1, col2, …) ON <table> TO anon, authenticated` — only safe columns
3. Owner/admin server functions continue to use `supabaseAdmin` (already do everywhere it matters — verified by audit)

Existing RLS policies stay in place; they still control which **rows** are visible.

Verified by `rg`: no browser-side direct selects on `profiles`/`deals`/`affiliate_links`. The 3 RLS-authenticated server-fn reads only touch safe columns (`profile.functions.ts` selects `id,username,display_name,bio,avatar_url,created_at`; `deals.functions.ts:85` already uses `supabaseAdmin` for `payout_method`).

### Migration

#### `profiles` — hide financial/payment/location-precise fields

Safe (granted): `id, username, display_name, bio, avatar_url, created_at, is_verified, verified_at, creator_agreement_accepted_at, business_agreement_accepted_at, place_name, thefork_url, is_restaurant, is_founding_creator, founding_creator_number, creator_joined_at, business_name, business_website_url, business_logo_url, business_city, business_country`

Hidden (revoked from anon/authenticated, still readable via `supabaseAdmin`):
`verified_by, verification_notes, lat, lng, address, power_tier_locked_at, rolling_12mo_gbv_cents, rolling_12mo_gbv_refreshed_at, stripe_connect_account_id, stripe_connect_status, payout_method, payout_bank_details_encrypted`

#### `deals` — hide `ical_token` only

Grant SELECT on every column except `ical_token` (the iCal feed token must stay private; it's only handed out via the owner-scoped `getOrCreateDealIcalToken` server fn).

#### `affiliate_links` — hide commission/parity/supplier internals

Hidden from anon/authenticated: `commission_pct, parity_exempt_reason, supplier_ref, canonical_key`. Owner reads (via `listMyAffiliateLinks` → `supabaseAdmin`) keep working.

### Code fixes (2 small edits)

1. **`src/lib/affiliate.functions.ts:117` (`listVideoAffiliateLinks`)** — publicly-callable server fn currently returns `select("*")` including `commission_pct`. Tighten to explicit safe column list: `id, creator_id, video_id, provider, label, url, is_active, click_count, created_at`. Mark `commission_pct` as `null` in the returned shape so the existing `AffiliateLink` type stays compatible.

2. **`src/lib/errors.functions.ts` (`logClientError`)** — add `.middleware([requireSupabaseAuth])` and derive `user_id` from `context.userId` instead of trusting `data.user_id`. Drop the `user_id` field from `PayloadSchema`. Wire any unauthenticated callers (e.g. global error boundary on public pages) to skip logging when no session is present, OR fall back to a separate anonymous-safe path that omits `user_id` — quick `rg` of `logClientError` call sites will determine which.

### After applying

- Run the security scan; expect ERRORs → **0** and supabase_lov items 3 → 0–1 (the `affiliate_links` commission warn should clear too).
- The ~50 `SECURITY DEFINER executable` warnings remain — those need the separate `REVOKE EXECUTE` sweep with a deliberate whitelist (still deferred).
- Update `@security-memory` to record the column-grant pattern as the project's chosen technique for partial-column public exposure.

### Risks / call-outs

- If any uninspected client component does `supabase.from("profiles").select("*")` it will start returning a permission error for the revoked columns. Mitigation: I'll run a final `rg` pass over the full src tree before shipping and route any remaining direct reads through a server fn.
- Anyone running a database backup/restore from older migrations needs to re-apply the column GRANTs — they're not captured by `pg_dump --no-acl` by default. Will document in the migration comment.
