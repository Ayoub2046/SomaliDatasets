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
