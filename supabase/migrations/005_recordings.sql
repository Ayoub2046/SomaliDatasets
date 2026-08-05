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