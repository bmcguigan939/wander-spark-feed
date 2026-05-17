-- Schedule daily expiring-deals notifications + emails at 09:00 UTC.
-- Calls the public TanStack endpoint which uses the anon key for auth.
do $$
declare
  v_anon text;
  v_url  text := 'https://project--144ee3b9-80e0-4ec8-883d-e0d5686cb4a1.lovable.app/api/public/cron/expiring-deals';
begin
  -- Resolve anon key (project may use either name)
  begin
    select decrypted_secret into v_anon from vault.decrypted_secrets where name = 'SUPABASE_PUBLISHABLE_KEY' limit 1;
  exception when others then v_anon := null; end;
  if v_anon is null then
    begin
      select decrypted_secret into v_anon from vault.decrypted_secrets where name = 'SUPABASE_ANON_KEY' limit 1;
    exception when others then v_anon := null; end;
  end if;

  -- Unschedule prior version if it exists
  perform cron.unschedule(jobid) from cron.job where jobname = 'travidz-expiring-deals-daily';

  perform cron.schedule(
    'travidz-expiring-deals-daily',
    '0 9 * * *',
    format($cron$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','apikey', %L),
        body := '{}'::jsonb
      );
    $cron$, v_url, coalesce(v_anon, ''))
  );
end $$;