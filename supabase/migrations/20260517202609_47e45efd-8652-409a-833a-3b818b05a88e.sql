
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('refresh-creator-tiers') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-creator-tiers');

SELECT cron.schedule(
  'refresh-creator-tiers',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--144ee3b9-80e0-4ec8-883d-e0d5686cb4a1.lovable.app/api/public/cron/refresh-creator-tiers',
    headers := jsonb_build_object('Content-Type','application/json','apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvenduaXF3d29laGFlcHpucnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzIxNDMsImV4cCI6MjA5NDQ0ODE0M30.MxbOJDgEp5QDl5ea6oW9KYavRkhpj1kSuYBmzyV8qZM'),
    body := '{}'::jsonb
  );
  $$
);
