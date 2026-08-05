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
