-- Enable pg_cron, pg_net, and Vault in Supabase first.
-- In Vault create trackfinance_backend_url (https://YOUR-API.vercel.app)
-- and trackfinance_cron_secret (same value as backend CRON_SECRET).
-- Run only after the API and database are ready. Re-running updates these jobs.

do $$
begin
  if (select count(*) from vault.decrypted_secrets where name = 'trackfinance_backend_url') <> 1
     or (select count(*) from vault.decrypted_secrets where name = 'trackfinance_cron_secret') <> 1 then
    raise exception 'Create exactly one Vault secret for each TrackFinance setting before scheduling';
  end if;
end $$;

select cron.schedule(
  'trackfinance-hourly', '5 * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'trackfinance_backend_url') || '/internal/jobs/hourly',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'trackfinance_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 300000
    );
  $job$
);

select cron.schedule(
  'trackfinance-weekly-digest', '0 7 * * 1',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'trackfinance_backend_url') || '/internal/jobs/weekly-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'trackfinance_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 300000
    );
  $job$
);
