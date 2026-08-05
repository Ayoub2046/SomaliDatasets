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