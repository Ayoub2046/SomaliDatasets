-- =============================================================
-- FIX SUBMIT · Run this in the Supabase SQL Editor.
-- Idempotent — safe to run again. Ensures the pieces needed to
-- submit a recording end-to-end:
--   1. missing business functions/triggers exist (apply_approval,
--      acquire_assignment, record_counters, grant_achievements)
--   2. buckets exist
--   3. RLS lets a member INSERT their own recording
--   4. storage lets them upload audio to their own private folder
--   5. seed sentences exist (so there is something to record)
-- =============================================================

-- =============================================================
-- 1) Missing business functions & triggers (migration 009)
-- =============================================================

-- Assignment acquisition
create or replace function public.acquire_assignment(p_user_id uuid)
returns public.assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.assignments;
begin
  with picked as (
    select s.id as sentence_id
    from public.sentences s
    where s.status = 'active'
      and s.is_recorded = false
      and not exists (
        select 1 from public.recordings r
        where r.sentence_id = s.id and r.status in ('approved','pending_review','validating','pending_upload')
      )
      and not exists (
        select 1 from public.assignments a
        where a.sentence_id = s.id and a.user_id = p_user_id and a.status in ('open','recorded')
      )
    order by random()
    limit 1
  )
  insert into public.assignments (sentence_id, user_id)
  select sentence_id, p_user_id from picked
  returning * into v_row;

  return v_row;
end $$;

-- Profile counters + daily progress
create or replace function public.record_counters()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  delta_total int := 0;
  delta_acc int := 0;
  delta_rej int := 0;
begin
  if tg_op = 'INSERT' then
    delta_total := 1;
    insert into public.daily_progress (user_id, day, recorded)
    values (new.user_id, current_date, 1)
    on conflict (user_id, day) do update set recorded = daily_progress.recorded + 1;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    delta_acc := (new.status = 'approved')::int - (old.status = 'approved')::int;
    delta_rej := (new.status = 'rejected')::int - (old.status = 'rejected')::int;
    insert into public.daily_progress (user_id, day, approved)
    values (new.user_id, current_date, greatest(delta_acc, 0))
    on conflict (user_id, day) do update set approved = daily_progress.approved + greatest(delta_acc, 0);
  end if;

  update public.profiles
     set total_submissions = total_submissions + delta_total,
         accepted = accepted + delta_acc,
         rejected = rejected + delta_rej,
         last_contribution_at = case when delta_total > 0 then now() else last_contribution_at end
   where id = new.user_id;

  return new;
end $$;

drop trigger if exists trg_record_counters on public.recordings;
create trigger trg_record_counters
  after insert or update on public.recordings
  for each row execute function public.record_counters();

-- Approve/reject side-effects
create or replace function public.apply_approval(
  p_recording_id uuid,
  p_decision text,
  p_source text,
  p_decided_by uuid,
  p_comment text default null
)
returns public.recordings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.recording_status;
  v_row public.recordings;
begin
  v_status := case
    when p_decision in ('approved','auto_approved') then 'approved'::public.recording_status
    when p_decision = 'rejected' then 'rejected'::public.recording_status
    else 'pending_review'::public.recording_status
  end;

  update public.recordings
     set status = v_status,
         reviewed_by = p_decided_by,
         reviewed_at = now(),
         rejection_reason = case when v_status = 'rejected' then coalesce(p_comment, 'Rejected by reviewer') else null end
   where id = p_recording_id
   returning * into v_row;

  if v_row is null then
    raise exception 'Recording % not found', p_recording_id;
  end if;

  insert into public.approvals (recording_id, decided_by, decision, source, comment)
  values (p_recording_id, p_decided_by, p_decision, p_source, p_comment);

  -- Only approved recordings enter the dataset sync queue.
  if v_status = 'approved' then
    insert into public.dataset_sync_queue (recording_id, target, status)
    values (p_recording_id, 'both', 'queued')
    on conflict (recording_id) do nothing;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after)
  values (p_decided_by, 'recording.' || v_status, 'recordings', p_recording_id,
          jsonb_build_object('decision', p_decision, 'source', p_source));

  return v_row;
end $$;

-- Achievement grant on submit
create or replace function public.grant_achievements()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_achievements (user_id, achievement_id)
  select new.id, a.id
    from public.achievements a
   where new.total_submissions >= a.threshold
     and not exists (
       select 1 from public.user_achievements ua
       where ua.user_id = new.id and ua.achievement_id = a.id
     );
  return new;
end $$;

drop trigger if exists trg_grant_achievements on public.profiles;
create trigger trg_grant_achievements
  after update of total_submissions on public.profiles
  for each row execute function public.grant_achievements();

-- =============================================================
-- 2) Private buckets must exist
-- =============================================================
insert into storage.buckets (id, name, public)
values ('pending-recordings', 'pending-recordings', false),
       ('approved-recordings', 'approved-recordings', false),
       ('rejected-recordings', 'rejected-recordings', false)
on conflict (id) do nothing;

-- =============================================================
-- 3) Recordings: allow an authenticated member to insert/update/delete their own row
-- =============================================================
drop policy if exists "recordings owner insert" on public.recordings;
create policy "recordings owner insert" on public.recordings
  for insert with check (auth.uid() = user_id);
drop policy if exists "recordings owner update" on public.recordings;
create policy "recordings owner update" on public.recordings
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "recordings owner or staff delete" on public.recordings;
create policy "recordings owner or staff delete" on public.recordings
  for delete using (auth.uid() = user_id or public.has_permission('recordings.approve'));

-- allow reviewers/admins to approve via the UI
-- NOTE: grant must use the FULL argument list (including the default
-- `p_comment text`); a shortened list raises 42883 "function does not exist".
grant execute on function public.apply_approval(uuid, text, text, uuid, text) to authenticated;
grant execute on function public.acquire_assignment(uuid) to authenticated;

-- =============================================================
-- 4) Storage: allow upload + read into the user's own private folder
-- =============================================================
drop policy if exists "pending bucket allow own upload" on storage.objects;
create policy "pending bucket allow own upload" on storage.objects
  for insert with check (
    bucket_id = 'pending-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "pending bucket allow own read" on storage.objects;
create policy "pending bucket allow own read" on storage.objects
  for select using (
    bucket_id = 'pending-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================
-- 5) Seed sentences (safe, idempotent) so the queue isn't empty
-- =============================================================
insert into public.sentences (text, language, dialect, category, difficulty, source, status)
select s.text, 'so', s.dialect, 'general', s.difficulty, 'seed', 'active'
from (values
  ('Maanta magaalada Muqdisho roob ayaa ka da''ay.', 'maxaa', 1),
  ('Ciyaaraha barrey ayaa aad u xiiso badnaa.',          'maxaa', 1),
  ('Waa inaan daryeelnaa deegaankayaga.',                  'maay',  2),
  ('Carruurtu waa u badan yihiin dalka Soomaaliya.',       'maxaa', 1),
  ('Waxaan jeclahay cuntooyinka dhaqanka Soomaaliyeed.',   'maxaa', 2),
  ('Geela Somaliyeed waxay caan ku yihiin aduunka oo dhan.','maxaa', 2),
  ('Soonku wuxuu bilaabmaa bisheeda Ramadaan.',            'maxaa', 2),
  ('Hoos deg oo naftaada qiftoodina ah.',                   'maay',  3),
  ('Runtu waxay mar walba dhaaftaa hadalka.',              'maxaa', 1),
  ('Caafimaadku waa nolosha, waana inna ilaalino.',        'maxaa', 2)
) as s(text, dialect, difficulty)
where not exists (select 1 from public.sentences where lower(text) = lower(s.text));
