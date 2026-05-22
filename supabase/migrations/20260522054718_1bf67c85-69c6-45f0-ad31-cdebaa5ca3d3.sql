-- Enable pgcrypto for symmetric encryption
create extension if not exists pgcrypto with schema extensions;

-- Store the symmetric key in Vault. Only the postgres role can read it.
do $$
declare
  existing_id uuid;
begin
  select id into existing_id from vault.secrets where name = 'app.bank_details_key';
  if existing_id is null then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'app.bank_details_key',
      'Symmetric key used to encrypt business payout bank details'
    );
  end if;
end $$;

-- Switch profiles.payout_bank_details_encrypted from text to bytea.
-- All current values are NULL (no business has set bank details yet), so
-- USING null::bytea is safe.
alter table public.profiles
  alter column payout_bank_details_encrypted drop default,
  alter column payout_bank_details_encrypted type bytea using null::bytea;

-- Encrypt helper: takes a JSONB payload, returns encrypted bytes.
create or replace function public.encrypt_bank_details(p jsonb)
returns bytea
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  k text;
begin
  select decrypted_secret into k
    from vault.decrypted_secrets
   where name = 'app.bank_details_key'
   limit 1;
  if k is null then
    raise exception 'bank_details_key not configured';
  end if;
  return extensions.pgp_sym_encrypt(p::text, k);
end
$$;

-- Decrypt helper: takes encrypted bytes, returns JSONB.
create or replace function public.decrypt_bank_details(c bytea)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  k text;
begin
  if c is null then
    return null;
  end if;
  select decrypted_secret into k
    from vault.decrypted_secrets
   where name = 'app.bank_details_key'
   limit 1;
  if k is null then
    raise exception 'bank_details_key not configured';
  end if;
  return extensions.pgp_sym_decrypt(c, k)::jsonb;
end
$$;

-- Lock these helpers down — only service_role (used by supabaseAdmin from
-- server functions) may call them. End users (anon/authenticated) cannot.
revoke all on function public.encrypt_bank_details(jsonb) from public;
revoke all on function public.encrypt_bank_details(jsonb) from anon, authenticated;
grant execute on function public.encrypt_bank_details(jsonb) to service_role;

revoke all on function public.decrypt_bank_details(bytea) from public;
revoke all on function public.decrypt_bank_details(bytea) from anon, authenticated;
grant execute on function public.decrypt_bank_details(bytea) to service_role;