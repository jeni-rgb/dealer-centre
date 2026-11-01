-- Part 3: scheduled jobs. Run after parts 1 and 2. Requires the pg_cron and pg_net extensions
-- (Database > Extensions in the Supabase dashboard, switch both on first).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Every minute: ask the app to process queued jobs (label printing, Square and Shopify sync, notifications).
select cron.schedule('dealer-centre-jobs', '* * * * *', $$
  select net.http_post(
    url := 'https://dealer-centre.vercel.app/api/jobs/run',
    headers := jsonb_build_object('authorization', 'Bearer I9EwRe20JPRlSHKvo9LwWdkslhdKYxtr', 'content-type', 'application/json'),
    body := '{}'::jsonb
  )
$$);

-- 02:00 daily: reconcile every connected channel against the last 48 hours of orders.
select cron.schedule('dealer-centre-reconcile', '0 2 * * *', $$
  insert into jobs (type, payload)
  select 'reconcile_channel', jsonb_build_object('channel_id', id) from channels where status = 'active' and type <> 'manual'
$$);
