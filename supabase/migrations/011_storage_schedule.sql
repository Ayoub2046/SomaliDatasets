-- =============================================================
-- 011 · Storage buckets + scheduling
-- =============================================================

-- Private audio buckets. All uploads land here via Edge Functions;
-- reads use short-lived signed URLs. Never public.
insert into storage.buckets (id, name, public)
values ('pending-recordings', 'pending-recordings', false),
       ('approved-recordings', 'approved-recordings', false),
       ('rejected-recordings', 'rejected-recordings', false)
on conflict (id) do nothing;

-- Only the server (via service_role) may write audio objects.
-- Signed-URL generation in Edge Functions bypasses storage RLS.
create policy "audio write server only" on storage.objects
  for insert with check (auth.role() = 'service_role');

create policy "audio read via signed url" on storage.objects
  for select using (auth.role() = 'service_role');

-- Refresh the leaderboard materialized view every 15 minutes.
create extension if not exists pg_cron;
select cron.schedule(
  'refresh-leaderboard',
  '*/15 * * * *',
  'refresh materialized view concurrently public.leaderboard_daily'
);
