
# Phase 2 — Business onboarding (Option A: Travidz as merchant)

We're staying on Lovable's built-in Stripe gateway. All customer payments
land in Travidz's single account. Businesses get paid by Travidz on a
schedule via manual bank transfer. No Stripe Connect.

## Goal

A business cannot list a bookable deal until they've supplied a payout
method (bank details). The data needed to pay them sits on their profile,
encrypted at rest.

## Scope (in)

1. **Profile fields already exist** from Phase 1: `payout_method`,
   `payout_bank_details_encrypted`, `stripe_connect_status` (unused for
   now — leave the column, mark default `none`).
2. **New `pgsop` symmetric encryption** for bank details so the service
   role can read/write but the column is never returned to the browser
   in plaintext. Use `pgcrypto` + a Vault-stored key
   (`app.bank_details_key`). Helper SQL functions
   `encrypt_bank_details(jsonb)` / `decrypt_bank_details(bytea)`.
3. **Server functions** in `src/lib/payout.functions.ts`:
   - `getMyPayoutMethod()` → returns `{ payout_method, bank: { account_holder, sort_code_last4, account_last4, iban_last4, country } | null }` (masked).
   - `saveBankPayoutMethod({ account_holder, country, sort_code?, account_number?, iban?, swift_bic? })` → validates with Zod, encrypts, writes to `profiles`, sets `payout_method='manual_bank'`. Returns the masked view.
   - `clearPayoutMethod()` → wipes the columns, sets `payout_method='none'`.
   All three use `requireSupabaseAuth`; only the calling user's row is touched.
4. **Onboarding step UI** at `/business/onboarding/payout` (and surfaced
   as a card on `/business/dashboard` when missing):
   - Country dropdown (GB / IE / EU SEPA / Other).
   - GB → sort code + account number + account holder name.
   - SEPA → IBAN + account holder name + (optional) SWIFT/BIC.
   - Other → IBAN + SWIFT/BIC + account holder name.
   - Inline validation (sort code 6 digits, IBAN checksum, etc.).
   - Save → success state showing masked details + "Change" / "Remove" buttons.
5. **Gate on listing creation**: in the existing "Create deal" flow, if
   the user toggles `bookable=true` and `payout_method='none'`, block
   submit with a clear inline message and a deep link to the payout step.
   (Legacy non-bookable deals stay creatable without payout setup.)
6. **Admin visibility**: in `/admin` user/business detail, show
   `payout_method` and masked bank summary so support can verify.

## Scope (out — later phases)

- Customer checkout (`/book/$dealId`) — Phase 3.
- Stripe webhook + booking state machine — Phase 4.
- Business confirm/reject + refund engine — Phase 5.
- Weekly payout cron + `business_payouts` rollups + admin payouts queue — Phase 6.
- Stripe Connect (would need a real Stripe account; not in scope).

## Data model changes

Minor — Phase 1 already added the columns. This phase only adds:

- Vault entry `app.bank_details_key` (32-byte random key, set once via migration).
- SQL helpers:
  ```sql
  create or replace function public.encrypt_bank_details(p jsonb)
  returns bytea language plpgsql security definer set search_path = public, extensions, vault as $$
  declare k text;
  begin
    select decrypted_secret into k from vault.decrypted_secrets where name = 'app.bank_details_key';
    return pgp_sym_encrypt(p::text, k);
  end $$;

  create or replace function public.decrypt_bank_details(c bytea)
  returns jsonb language plpgsql security definer set search_path = public, extensions, vault as $$
  declare k text;
  begin
    select decrypted_secret into k from vault.decrypted_secrets where name = 'app.bank_details_key';
    return pgp_sym_decrypt(c, k)::jsonb;
  end $$;

  revoke execute on function public.encrypt_bank_details(jsonb) from anon, authenticated;
  revoke execute on function public.decrypt_bank_details(bytea) from anon, authenticated;
  ```
- Switch `profiles.payout_bank_details_encrypted` from `text` to `bytea`
  (currently empty in all rows, so the type change is safe).

## Files to add / edit

```text
supabase/migrations/<ts>_payout_encryption.sql   (new)
src/lib/payout.functions.ts                      (new)
src/routes/business/onboarding/payout.tsx        (new)
src/components/business/PayoutMethodCard.tsx     (new — used on dashboard + onboarding)
src/routes/business/dashboard.tsx                (edit — add card + gate)
src/routes/business/deals/new.tsx                (edit — bookable + payout gate)
src/routes/admin/users.$id.tsx                   (edit — show masked payout info)
```

## Validation rules (Zod, server-side)

- `account_holder`: 2–80 chars, letters/spaces/`'-.` only.
- `country`: ISO-3166 alpha-2.
- GB: `sort_code` `^\d{6}$`, `account_number` `^\d{8}$`.
- SEPA/IBAN: strip spaces, length 15–34, mod-97 checksum, uppercase.
- `swift_bic`: `^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$` when provided.
- Reject if neither GB pair nor IBAN is present.

## Test plan

1. Onboarding GB happy path: sort code + account → save → masked card shows `••••34`.
2. SEPA happy path: valid IBAN → save → masked card shows last 4.
3. Invalid IBAN → 400 with field-level error.
4. Try to create a `bookable=true` deal with no payout method → blocked with link.
5. Set payout method, then create bookable deal → succeeds.
6. As admin, view that business → masked bank summary visible.
7. SQL check: `select payout_bank_details_encrypted is not null, length(payout_bank_details_encrypted) from profiles where id = '<test user>'` returns a non-trivial bytea (plaintext never stored).
8. Confirm `decrypt_bank_details` is not callable by `authenticated` role
   (`select has_function_privilege('authenticated', 'public.decrypt_bank_details(bytea)', 'execute')` → false).

## Open question

Default payout currency at this stage is GBP (matches plan). Confirm
before I build, or say "GBP only" and I'll proceed.
