DO $$
BEGIN
  PERFORM cron.unschedule('travidz-generate-payout-drafts-weekly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('travidz-generate-payout-drafts-monthly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'travidz-generate-payout-drafts-monthly',
  '0 8 1 * *',
  $$SELECT public.generate_draft_payout_runs(
    (date_trunc('month', now()) - interval '1 month')::date,
    (date_trunc('month', now()) - interval '1 day')::date,
    2000
  );$$
);