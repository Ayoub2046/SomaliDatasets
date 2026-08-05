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