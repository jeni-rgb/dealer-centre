-- Storage bucket for photos, labels and statements. Photos public, PDFs served via signed URL.
insert into storage.buckets (id, name, public) values ('files', 'files', true) on conflict (id) do nothing;

create policy "public read item photos" on storage.objects for select
  using (bucket_id = 'files' and (storage.foldername(name))[1] = 'items');
create policy "authenticated upload item photos" on storage.objects for insert
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = 'items' and auth.role() = 'authenticated');

-- Nightly reconciliation and token refresh enqueue. Requires pg_cron and pg_net on the project.
-- Vercel cron calls /api/jobs/run every minute; these only add rows to the jobs table.
create extension if not exists pg_cron;
select cron.schedule('reconcile-nightly', '0 2 * * *', $$
  insert into jobs (type, payload)
  select 'reconcile_channel', jsonb_build_object('channel_id', id) from channels where status = 'active'
$$);
