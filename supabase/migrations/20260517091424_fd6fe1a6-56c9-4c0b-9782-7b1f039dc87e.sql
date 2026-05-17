
SELECT cron.schedule(
  'travidz-generate-payout-drafts-weekly',
  '0 8 * * 1',
  $$SELECT public.generate_draft_payout_runs(NULL, NULL, 2000);$$
);
