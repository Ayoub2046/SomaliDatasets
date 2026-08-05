-- =============================================================
-- 001 · Roles, permissions & access model
-- =============================================================

create type public.app_role as enum ('member', 'reviewer', 'admin', 'super_admin');

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code public.app_role unique not null,
  label text not null,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text
);

create table public.role_permissions (
  role public.app_role not null references public.roles(code) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role, permission_id)
);

-- Seed the access matrix (idempotent)
insert into public.roles (code, label) values
  ('member', 'Member'),
  ('reviewer', 'Reviewer'),
  ('admin', 'Admin'),
  ('super_admin', 'Super Admin')
on conflict (code) do nothing;

insert into public.permissions (code, description) values
  ('recordings.submit', 'Submit a voice recording'),
  ('recordings.approve', 'Approve or reject recordings'),
  ('recordings.view_all', 'View all recordings'),
  ('sentences.manage', 'Create/edit/delete sentences'),
  ('users.view', 'View user directory'),
  ('users.manage', 'Ban/unban and change roles'),
  ('sync.manage', 'Trigger and monitor dataset sync'),
  ('sync.export', 'Export dataset snapshots'),
  ('audit.view', 'Read audit logs')
on conflict (code) do nothing;

insert into public.role_permissions (role, permission_id)
select r.code, p.id
from (values
  ('member', 'recordings.submit'),
  ('reviewer', 'recordings.submit'),
  ('reviewer', 'recordings.approve'),
  ('reviewer', 'recordings.view_all'),
  ('reviewer', 'sentences.manage'),
  ('admin', 'recordings.submit'),
  ('admin', 'recordings.approve'),
  ('admin', 'recordings.view_all'),
  ('admin', 'sentences.manage'),
  ('admin', 'users.view'),
  ('admin', 'sync.manage'),
  ('admin', 'sync.export'),
  ('super_admin', 'recordings.submit'),
  ('super_admin', 'recordings.approve'),
  ('super_admin', 'recordings.view_all'),
  ('super_admin', 'sentences.manage'),
  ('super_admin', 'users.view'),
  ('super_admin', 'users.manage'),
  ('super_admin', 'sync.manage'),
  ('super_admin', 'sync.export'),
  ('super_admin', 'audit.view')
) as x(role, pcode)
join public.roles r on r.code = x.role::public.app_role
join public.permissions p on p.code = x.pcode
on conflict (role, permission_id) do nothing;

-- =============================================================
-- 002 · Profiles
-- =============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text,
  photo text,
  country text,
  language text not null default 'so',
  dialect text check (dialect in ('maxaa','maay','neutral')),
  bio text,
  role public.app_role not null default 'member',
  status text not null default 'active' check (status in ('active','banned','pending')),
  gender text check (gender in ('male','female','other','prefer_not_to_say')),
  age_group text check (age_group in ('13-17','18-29','30-49','50-64','65+')),
  consent_approved_at timestamptz,
  total_submissions int not null default 0,
  accepted int not null default 0,
  rejected int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_contribution_at timestamptz,
  joined_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index profiles_rank_idx on public.profiles(total_submissions desc);

-- Auto-provision a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, email, country, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email, 'contributor'), '@', 1), 'contributor'),
    new.email,
    coalesce(new.raw_user_meta_data->>'country', 'Somalia'),
    coalesce(new.raw_user_meta_data->>'language', 'so')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- 003 · Sentences
-- =============================================================

create table public.sentences (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  language text not null default 'so',
  dialect text check (dialect in ('maxaa','maay','neutral')),
  category text not null default 'general',
  difficulty smallint not null default 1 check (difficulty between 1 and 5),
  source text,
  is_recorded boolean not null default false,
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index sentences_status_idx on public.sentences(status) where status = 'active';
create index sentences_dialect_idx on public.sentences(dialect);
create unique index sentences_text_uq on public.sentences(lower(text));

-- =============================================================
-- 004 · Assignments (who records which sentence, once)
-- =============================================================

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  sentence_id uuid not null references public.sentences(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'open' check (status in ('open','recorded','skipped','expired')),
  assigned_at timestamptz not null default now(),
  expired_at timestamptz,
  unique (sentence_id, user_id)
);

create index assignments_user_open_idx on public.assignments(user_id, status) where status = 'open';
create index assignments_queue_idx on public.assignments(status, assigned_at);

-- =============================================================
-- 005 · Recordings
-- =============================================================

create type public.recording_status as enum ('pending_upload','uploaded','validating','pending_review','approved','rejected','archived');

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.assignments(id) on delete set null,
  sentence_id uuid not null references public.sentences(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.recording_status not null default 'pending_upload',
  storage_key text,
  duration numeric check (duration between 0.5 and 30),
  sample_rate int, channels int, format text,
  noise_level smallint check (noise_level between 1 and 5),
  gender text, age_group text,
  device text, browser text, app_version text,
  client_checks jsonb not null default '{}',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  validation jsonb,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index recordings_status_idx on public.recordings(status);
create index recordings_user_idx on public.recordings(user_id);
create index recordings_sentence_idx on public.recordings(sentence_id);
create index recordings_review_queue_idx on public.recordings(status, created_at)
  where status in ('validating','pending_review');
-- =============================================================
-- 006 · Validation results  |  007 · Approvals
-- =============================================================

create table public.validation_results (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null unique references public.recordings(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','pass','fail','error')),
  checks jsonb not null default '{}',
  scores jsonb,
  transcript text,
  audio_hash text,
  model text,
  ran_at timestamptz not null default now()
);

create index validation_status_idx on public.validation_results(status);
create index validation_hash_idx on public.validation_results(audio_hash);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings(id) on delete cascade,
  decided_by uuid references public.profiles(id) on delete set null,
  decision text not null check (decision in ('auto_approved','approved','rejected','requires_review')),
  source text not null check (source in ('ai','reviewer','admin')),
  comment text,
  decided_at timestamptz not null default now()
);

create index approvals_recording_idx on public.approvals(recording_id);
-- =============================================================
-- 007 · Notifications  |  008 · Achievements  |  009 · Daily progress
-- =============================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('achievement','approval','milestone','system')),
  title text not null,
  message text,
  payload jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_read_idx on public.notifications(user_id, is_read);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  icon text,
  threshold int not null,
  unit text not null default 'recordings'
);

insert into public.achievements (code, title, icon, threshold) values
  ('bronze', 'Bronze', '🥉', 100),
  ('silver', 'Silver', '🥈', 500),
  ('gold', 'Gold', '🥇', 1000),
  ('diamond', 'Diamond', '💎', 10000)
on conflict (code) do update set title = excluded.title, icon = excluded.icon;

create table public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table public.daily_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default current_date,
  recorded int not null default 0,
  approved int not null default 0,
  primary key (user_id, day)
);
create index daily_progress_day_idx on public.daily_progress(day);
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
-- =============================================================
-- 009 · Business-logic functions & triggers
-- =============================================================

-- ---------- Assignment acquisition ----------
-- Grab the next available sentence for a user without a live assignment.
-- Returns one row or none; used by the recording API (Edge Function).
create or replace function public.acquire_assignment(p_user_id uuid)
returns public.assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.assignments;
begin
  with picked as (
    select s.id as sentence_id
    from public.sentences s
    where s.status = 'active'
      and s.is_recorded = false
      and not exists (
        select 1 from public.recordings r
        where r.sentence_id = s.id and r.status in ('approved','pending_review','validating','pending_upload')
      )
      and not exists (
        select 1 from public.assignments a
        where a.sentence_id = s.id and a.user_id = p_user_id and a.status in ('open','recorded')
      )
    order by random()
    limit 1
  )
  insert into public.assignments (sentence_id, user_id)
  select sentence_id, p_user_id from picked
  returning * into v_row;

  return v_row;
end $$;

-- ---------- Profile counters + daily progress ----------
create or replace function public.record_counters()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  delta_total int := 0;
  delta_acc int := 0;
  delta_rej int := 0;
begin
  if tg_op = 'INSERT' then
    delta_total := 1;
    insert into public.daily_progress (user_id, day, recorded)
    values (new.user_id, current_date, 1)
    on conflict (user_id, day) do update set recorded = daily_progress.recorded + 1;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    delta_acc := (new.status = 'approved')::int - (old.status = 'approved')::int;
    delta_rej := (new.status = 'rejected')::int - (old.status = 'rejected')::int;
    insert into public.daily_progress (user_id, day, approved)
    values (new.user_id, current_date, greatest(delta_acc, 0))
    on conflict (user_id, day) do update set approved = daily_progress.approved + greatest(delta_acc, 0);
  end if;

  update public.profiles
     set total_submissions = total_submissions + delta_total,
         accepted = accepted + delta_acc,
         rejected = rejected + delta_rej,
         last_contribution_at = case when delta_total > 0 then now() else last_contribution_at end
   where id = new.user_id;

  return new;
end $$;

drop trigger if exists trg_record_counters on public.recordings;
create trigger trg_record_counters
  after insert or update on public.recordings
  for each row execute function public.record_counters();

-- ---------- Approve/reject side-effects ----------
-- Move the recording status, create an approval row, and enqueue dataset sync.
create or replace function public.apply_approval(
  p_recording_id uuid,
  p_decision text,
  p_source text,
  p_decided_by uuid,
  p_comment text default null
)
returns public.recordings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.recording_status;
  v_row public.recordings;
begin
  v_status := case
    when p_decision in ('approved','auto_approved') then 'approved'::public.recording_status
    when p_decision = 'rejected' then 'rejected'::public.recording_status
    else 'pending_review'::public.recording_status
  end;

  update public.recordings
     set status = v_status,
         reviewed_by = p_decided_by,
         reviewed_at = now(),
         rejection_reason = case when v_status = 'rejected' then coalesce(p_comment, 'Rejected by reviewer') else null end
   where id = p_recording_id
   returning * into v_row;

  if v_row is null then
    raise exception 'Recording % not found', p_recording_id;
  end if;

  insert into public.approvals (recording_id, decided_by, decision, source, comment)
  values (p_recording_id, p_decided_by, p_decision, p_source, p_comment);

  -- Only approved recordings enter the dataset sync queue.
  if v_status = 'approved' then
    insert into public.dataset_sync_queue (recording_id, target, status)
    values (p_recording_id, 'both', 'queued')
    on conflict (recording_id) do nothing;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after)
  values (p_decided_by, 'recording.' || v_status, 'recordings', p_recording_id,
          jsonb_build_object('decision', p_decision, 'source', p_source));

  return v_row;
end $$;

-- ---------- Achievement grant on submit ----------
create or replace function public.grant_achievements()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_achievements (user_id, achievement_id)
  select new.user_id, a.id
    from public.achievements a
   where new.total_submissions >= a.threshold
     and not exists (
       select 1 from public.user_achievements ua
       where ua.user_id = new.user_id and ua.achievement_id = a.id
     );
  return new;
end $$;

drop trigger if exists trg_grant_achievements on public.profiles;
create trigger trg_grant_achievements
  after update of total_submissions on public.profiles
  for each row execute function public.grant_achievements();

-- =============================================================
-- 010 · Row Level Security
--
-- Convention:
--   · anon/authenticated users only read through RLS
--   · every WRITE goes through Edge Functions (service_role)
--   · helpers below centralise role checks so policies stay DRY
-- =============================================================

-- ---------- RBAC helpers ----------
create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.has_permission(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.profiles p
      join public.role_permissions rp on rp.role = p.role
      join public.permissions per on per.id = rp.permission_id
     where p.id = auth.uid() and per.code = p_code
  )
$$;

-- Enable RLS everywhere
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.sentences enable row level security;
alter table public.assignments enable row level security;
alter table public.recordings enable row level security;
alter table public.validation_results enable row level security;
alter table public.approvals enable row level security;
alter table public.notifications enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.daily_progress enable row level security;
alter table public.dataset_sync_queue enable row level security;
alter table public.audit_logs enable row level security;

-- ---------- Reference data ----------
create policy "roles readable" on public.roles for select using (true);
create policy "permissions readable" on public.permissions for select using (true);
create policy "role_permissions readable" on public.role_permissions for select using (true);
create policy "achievements readable" on public.achievements for select using (true);

-- ---------- Profiles ----------
create policy "profiles select" on public.profiles for select using (true);
create policy "profiles owner update" on public.profiles for update using (auth.uid() = id);
create policy "profiles staff update" on public.profiles for update using (public.has_permission('users.manage'));

-- ---------- Sentences ----------
create policy "sentences select" on public.sentences for select using (true);
create policy "sentences staff manage" on public.sentences for all
  using (public.has_permission('sentences.manage'))
  with check (public.has_permission('sentences.manage'));

-- ---------- Assignments ----------
create policy "assignments owner select" on public.assignments for select using (auth.uid() = user_id or public.has_permission('recordings.view_all'));
create policy "assignments owner skip" on public.assignments for update using (auth.uid() = user_id);

-- ---------- Recordings ----------
create policy "recordings owner select" on public.recordings for select using (auth.uid() = user_id or public.has_permission('recordings.view_all'));
create policy "recordings staff approve" on public.recordings for update using (public.has_permission('recordings.approve'));

-- ---------- Validation & approvals ----------
create policy "validation staff" on public.validation_results for select using (public.has_permission('recordings.view_all'));
create policy "approvals staff" on public.approvals for select using (public.has_permission('recordings.view_all'));

-- ---------- Notifications ----------
create policy "notifications owner" on public.notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- Gamification ----------
create policy "user_achievements select" on public.user_achievements for select using (true);
create policy "daily_progress owner" on public.daily_progress for select using (auth.uid() = user_id or public.has_permission('recordings.view_all'));

-- ---------- Sync & audit (staff/super-admin only) ----------
create policy "sync staff" on public.dataset_sync_queue for select using (public.has_permission('sync.manage'));
create policy "audit superadmin" on public.audit_logs for select using (public.current_role() = 'super_admin');

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

-- =============================================================
-- 012 · Super-admin bootstrap + guarded promotion
--
-- The first super_admin can be claimed while zero super_admins
-- exist (bootstrap, e.g. from the SQL console or a guarded Edge
-- Function). After that, only an existing super_admin may promote
-- or demote. Edge Functions pass the acting user id explicitly,
-- since auth.uid() is null under service_role.
-- =============================================================

-- Guarded promotion. p_actor_id may be null ONLY during bootstrap
-- (no super_admin exists yet); otherwise the actor must be one.
create or replace function public.promote_to_super_admin(p_actor_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_super_count int;
  v_actor_role public.app_role;
begin
  select count(*) into v_super_count
    from public.profiles where role = 'super_admin' and status = 'active';

  if v_super_count > 0 then
    select role into v_actor_role from public.profiles where id = p_actor_id;
    if v_actor_role is null then
      raise exception 'Actor not found';
    end if;
    if v_actor_role <> 'super_admin' then
      raise exception 'Only an existing super_admin may promote users';
    end if;
  end if;

  update public.profiles
     set role = 'super_admin'
   where id = p_user_id
     and status = 'active';

  if not found then
    raise exception 'Target user not found or inactive';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after)
  values (p_actor_id, 'profile.promote_super_admin', 'profiles', p_user_id,
          jsonb_build_object('target_role', 'super_admin'));

  return true;
end $$;

-- Demote is super_admin-only (actor must be an existing super_admin).
create or replace function public.demote_from_super_admin(p_actor_id uuid, p_user_id uuid, p_target_role public.app_role)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_actor_role public.app_role;
  v_super_count int;
begin
  if p_target_role = 'super_admin' then
    raise exception 'Target role cannot be super_admin when demoting';
  end if;

  select role into v_actor_role from public.profiles where id = p_actor_id;
  if v_actor_role is null then
    raise exception 'Actor not found';
  end if;
  if v_actor_role <> 'super_admin' then
    raise exception 'Only a super_admin may demote users';
  end if;

  -- Never allow removing the last active super_admin.
  select count(*) into v_super_count
    from public.profiles where role = 'super_admin' and status = 'active' and id <> p_user_id;
  if v_super_count = 0 then
    raise exception 'Cannot demote the last active super_admin';
  end if;

  update public.profiles set role = p_target_role where id = p_user_id;

  if not found then
    raise exception 'Target user not found';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after)
  values (p_actor_id, 'profile.demote_super_admin', 'profiles', p_user_id,
          jsonb_build_object('target_role', p_target_role));

  return true;
end $$;

-- Direct clients can never call these; only the service_role path
-- (Edge Functions) executes them.
revoke execute on function public.promote_to_super_admin(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.demote_from_super_admin(uuid, uuid, public.app_role) from public, anon, authenticated;
grant execute on function public.promote_to_super_admin(uuid, uuid) to service_role;
grant execute on function public.demote_from_super_admin(uuid, uuid, public.app_role) to service_role;

-- =============================================================
-- 013 · Admin login attempts (rate limiting + audit)
--
-- Written only by the admin-auth Edge Function (service_role).
-- Rows expire after 1 hour and are purged opportunistically.
-- =============================================================

create table public.admin_login_attempts (
  id bigint generated always as identity primary key,
  ip inet not null,
  email text not null,
  success boolean not null default false,
  attempted_at timestamptz not null default now()
);

create index admin_login_attempts_ip_time_idx on public.admin_login_attempts(ip, attempted_at desc);
create index admin_login_attempts_email_time_idx on public.admin_login_attempts(lower(email), attempted_at desc);

alter table public.admin_login_attempts enable row level security;
-- No RLS policies: this table is service-role only by design.
create policy "admin_login_attempts service only" on public.admin_login_attempts
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Count recent failures for a given ip + email window.
create or replace function public.recent_admin_login_failures(p_ip inet, p_email text, p_window interval)
returns int language sql stable security definer set search_path = public as $$
  select count(*)
    from public.admin_login_attempts
   where ip = p_ip
     and lower(email) = lower(p_email)
     and success = false
     and attempted_at > now() - p_window
$$;

revoke execute on function public.recent_admin_login_failures(inet, text, interval) from public, anon, authenticated;
grant execute on function public.recent_admin_login_failures(inet, text, interval) to service_role;

-- Opportunistic purge of rows older than 1 hour.
create or replace function public.purge_admin_login_attempts()
returns void language sql security definer set search_path = public as $$
  delete from public.admin_login_attempts where attempted_at < now() - interval '1 hour'
$$;

revoke execute on function public.purge_admin_login_attempts() from public, anon, authenticated;
grant execute on function public.purge_admin_login_attempts() to service_role;

-- =============================================================
-- 014 · Client CRUD allowances for the live web app
--
-- The app now reads/writes everything from Postgres directly.
-- These policies let authenticated members:
--   · submit a recording (their own)
--   · update/delete their own recordings
-- Staff can approve/reject via apply_assignment/apply_approval.
-- =============================================================

-- ---------- Recordings: owner CRUD ----------
create policy "recordings owner insert" on public.recordings
  for insert with check (auth.uid() = user_id);

create policy "recordings owner update" on public.recordings
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "recordings owner or staff delete" on public.recordings
  for delete using (auth.uid() = user_id or public.has_permission('recordings.approve'));

-- Allow authenticated reviewers/admins to run apply_approval through the UI.
grant execute on function public.apply_approval(uuid, text, text, uuid) to authenticated;
grant execute on function public.acquire_assignment(uuid) to authenticated;

-- ---------- Storage: authenticated upload to own private folder ----------
-- Users may upload only under pending-recordings/<their-uid>/ and read it back.
create policy "pending bucket allow own upload" on storage.objects
  for insert with check (
    bucket_id = 'pending-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pending bucket allow own read" on storage.objects
  for select using (
    bucket_id = 'pending-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
