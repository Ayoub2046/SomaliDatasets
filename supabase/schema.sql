-- =============================================================
-- CaawiyeAI · Supabase PostgreSQL schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- =============================================================

-- Extended profiles (mirrors auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text not null default 'contributor',
  email text,
  photo text,
  country text default 'Somalia',
  language text default 'Somali',
  bio text default '',
  role text not null default 'member' check (role in ('member','admin')),
  joined_at timestamptz not null default now(),
  total_submissions int not null default 0,
  accepted int not null default 0,
  rejected int not null default 0
);

create table if not exists public.sentences (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  language text not null default 'so',
  category text default 'general',
  difficulty text default 'easy',
  is_recorded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  sentence_id uuid references public.sentences(id) on delete set null,
  user_id uuid references public.profiles(id) on delete cascade,
  audio_url text,
  duration numeric,
  noise int check (noise between 1 and 5),
  gender text,
  age_group text,
  device text,
  browser text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists datasets_status_idx on public.datasets(status);
create index if not exists datasets_user_idx on public.datasets(user_id);
create index if not exists profiles_rank_idx on public.profiles(total_submissions desc);

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.profiles enable row level security;
alter table public.sentences enable row level security;
alter table public.datasets enable row level security;

-- Profiles: anyone signed-in can read; owner can update
create policy "public read profiles" on public.profiles for select using (true);
create policy "owner update profile" on public.profiles for update using (auth.uid() = id);

-- Sentences: readable publicly
create policy "public read sentences" on public.sentences for select using (true);
create policy "insert sentences" on public.sentences for insert with check (true);
create policy "admin manage sentences" on public.sentences for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Datasets: signed-in users can read, insert own; admins update/delete
create policy "read datasets" on public.datasets for select using (true);
create policy "insert own dataset" on public.datasets for insert with check (auth.uid() = user_id);
create policy "admin update datasets" on public.datasets for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "admin delete datasets" on public.datasets for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- =============================================================
-- Helpers
-- =============================================================
-- Auto-increment a profile's counters when a dataset status changes.
create or replace function public.touch_profile()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set total_submissions = total_submissions + 1 where id = new.user_id;
  elsif tg_op = 'UPDATE' then
    update public.profiles
       set accepted = accepted + (new.status = 'accepted')::int - (old.status = 'accepted')::int,
           rejected = rejected + (new.status = 'rejected')::int - (old.status = 'rejected')::int
     where id = new.user_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_dataset_touch on public.datasets;
create trigger trg_dataset_touch
after insert or update on public.datasets
for each row execute function public.touch_profile();

-- Promote the first user to admin (run once manually, or leave for demo admin).
-- update public.profiles set role = 'admin' where id = '<your-auth-uid>';

-- Storage bucket for audio
insert into storage.buckets (id, name, public) values ('audio', 'audio', true)
on conflict (id) do nothing;