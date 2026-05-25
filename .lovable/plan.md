
## Safe security fixes — single migration

One migration covering the four "safe to auto-fix" findings. Application code is not touched.

### 1. Function `search_path` hardening (5 findings)

Add `SET search_path = public, pg_temp` to every PL/pgSQL function in `public` that's missing it. Confirmed targets via `pg_proc` inspection:

- `enqueue_email(text, jsonb)` — SECURITY DEFINER
- `read_email_batch(text, integer, integer)` — SECURITY DEFINER
- `delete_email(text, bigint)` — SECURITY DEFINER
- `move_to_dlq(text, text, bigint, jsonb)` — SECURITY DEFINER
- `videos_update_search_tsv()` — trigger function

Done via `ALTER FUNCTION ... SET search_path = public, pg_temp` — bodies untouched.

### 2. RLS-enabled-no-policy tables (2 findings)

Confirmed: `public.rate_limit_hits` and `public.video_views`. Both are written exclusively server-side via `supabaseAdmin` (which bypasses RLS) and never queried from the browser. Current state silently blocks all client access — correct behavior, but the linter flags the empty-policy ambiguity.

Fix: add an explicit restrictive deny-all policy on each so intent is documented:

```sql
CREATE POLICY "deny all client access" ON public.rate_limit_hits
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
-- same for video_views
```

This is a no-op at runtime (already blocked) but makes the policy explicit so the scanner and future readers see the intent.

Note: `video_views` previously had no client-side insert path — confirmed `recordView` and similar are server-fn only. If you ever want client-side view logging we'd add a separate INSERT policy.

### 3. Overly permissive INSERT policies (2 findings)

Two intentional anonymous click-tracking inserts use `WITH CHECK (true)`:

- `public.business_clicks` — `Anyone can log a click`
- `public.partner_clicks` — `partner_clicks anon insert`

Tighten the `WITH CHECK` so authenticated users can only insert rows attributed to themselves (or anonymous), preventing one user from forging clicks attributed to another:

```sql
WITH CHECK (user_id IS NULL OR user_id = auth.uid())
```

For `partner_clicks` we'll also constrain `partner` and `destination_url` lengths via a CHECK constraint to mildly cap junk payloads.

### 4. Scope of work (single migration)

```text
supabase/migrations/<ts>_safe_security_hardening.sql
├─ ALTER FUNCTION search_path on 5 functions
├─ CREATE POLICY restrictive deny-all on rate_limit_hits, video_views
└─ DROP + CREATE tightened INSERT policies on business_clicks, partner_clicks
```

No application code changes. No data migrations. Fully reversible.

---

### Deferred for explicit review (NOT in this migration)

These remain open and need your sign-off before I touch them, because each has app-behaviour or business risk:

- **Errors (3):** profiles column-leakage policy rewrite, business_invites commission-column split, removing/gating the `users can self-assign creator role` policy.
- **SECURITY DEFINER function executability (50):** mass `REVOKE EXECUTE FROM anon, authenticated` requires whitelisting the few functions the client actually calls — risk of breaking realtime/match search if I get the whitelist wrong.
- **Public storage bucket listing (2):** need to confirm which buckets and whether listing is used anywhere in the app.
- **Hardcoded Mapbox token + `logClientError` auth gap (2):** these are code changes (not migrations) and require token rotation on your side.
- **Extensions in public (2):** already accepted in security memory; will mark as ignored after this migration.

I'll surface each deferred group as a follow-up once the safe set lands.
