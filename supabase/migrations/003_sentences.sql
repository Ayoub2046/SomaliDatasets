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
