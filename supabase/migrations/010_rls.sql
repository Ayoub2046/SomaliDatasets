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
