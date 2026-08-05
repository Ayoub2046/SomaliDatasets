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
