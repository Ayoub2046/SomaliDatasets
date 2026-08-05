-- =============================================================
-- 008 · Leaderboard view  |  Sync queue  |  Audit logs
-- =============================================================

create materialized view public.leaderboard_daily as
  select row_number() over (
           order by count(*) filter (where r.status = 'approved') desc, u.username asc
         ) as rank,
         u.id as user_id,
         u.username,
         u.photo,
         u.country,
         count(*) filter (where r.status = 'approved') as approved,
         count(*) filter (where r.created_at >= now() - interval '7 days' and r.status = 'approved') as weekly,
         count(*) filter (where r.created_at >= now() - interval '30 days' and r.status = 'approved') as monthly
  from public.recordings r
  join public.profiles u on u.id = r.user_id
  group by u.id, u.username, u.photo, u.country;

create unique index leaderboard_user_uq on public.leaderboard_daily(user_id);

-- Refresh is scheduled via pg_cron in migration 011 (or run manually):
-- refresh materialized view concurrently public.leaderboard_daily;
-- create unique index leaderboard_user_uq on public.leaderboard(user_id);

create table public.dataset_sync_queue (
  id bigint generated always as identity primary key,
  recording_id uuid not null unique references public.recordings(id) on delete cascade,
  target text not null check (target in ('tts','stt','both')),
  status text not null default 'queued' check (status in ('queued','uploading','uploaded','failed','skipped')),
  attempts int not null default 0,
  last_error text,
  uploaded_at timestamptz,
  queued_at timestamptz not null default now()
);
create index sync_queue_status_idx on public.dataset_sync_queue(status) where status in ('queued','failed');

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_logs_actor_idx on public.audit_logs(actor_id);
create index audit_logs_action_idx on public.audit_logs(action);
create index audit_logs_created_idx on public.audit_logs(created_at desc);