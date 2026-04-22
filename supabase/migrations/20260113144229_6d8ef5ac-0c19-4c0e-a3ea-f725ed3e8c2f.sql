-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the renewal alerts check to run daily at 8am (Brazil time - UTC-3)
SELECT cron.schedule(
  'check-renewal-alerts-daily',
  '0 11 * * *', -- 11:00 UTC = 08:00 BRT
  $$
  SELECT
    net.http_post(
        url:='https://bwucqiqnxwdqapunbwip.supabase.co/functions/v1/check-renewal-alerts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3dWNxaXFueHdkcWFwdW5id2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMzM2OTYsImV4cCI6MjA5MTkwOTY5Nn0.drat4Td2K2OeUFaq-BLiGgqZGp67wfSwoA2vpsEU4gE"}'::jsonb,
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);
