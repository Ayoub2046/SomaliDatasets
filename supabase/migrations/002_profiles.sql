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
