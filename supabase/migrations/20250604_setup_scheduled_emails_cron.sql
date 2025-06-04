
-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover job existente se houver
SELECT cron.unschedule('process-scheduled-emails-job');

-- Criar o cron job para processar emails agendados a cada minuto
SELECT cron.schedule(
  'process-scheduled-emails-job',
  '* * * * *', -- A cada minuto
  $$
  SELECT
    net.http_post(
        url := 'https://czinoycvwsjjxuqbuxtm.supabase.co/functions/v1/process-scheduled-emails',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aW5veWN2d3Nqanh1cWJ1eHRtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTU5NzY2NSwiZXhwIjoyMDYxMTczNjY1fQ.BdZXwvCFhQ3Qs1Vqf5AzSo4UcSDR4WZKJ5Xj8VJE_G0"}'::jsonb,
        body := '{"triggered_by": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Verificar se o job foi criado
SELECT jobid, schedule, command FROM cron.job WHERE jobname = 'process-scheduled-emails-job';
