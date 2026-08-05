-- =============================================================
-- FIX SUBMIT · Run this in the Supabase SQL Editor.
-- Idempotent. Ensures the pieces needed to submit a recording:
--   1. buckets exist
--   2. RLS lets a member INSERT their own recording
--   3. storage lets them upload audio to their own private folder
--   4. seed sentences exist (so there is something to record)
-- =============================================================

-- 1) Private buckets must exist
insert into storage.buckets (id, name, public)
values ('pending-recordings', 'pending-recordings', false),
       ('approved-recordings', 'approved-recordings', false),
       ('rejected-recordings', 'rejected-recordings', false)
on conflict (id) do nothing;

-- 2) Recordings: allow an authenticated member to insert/update/delete their own row
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
grant execute on function public.apply_approval(uuid, text, text, uuid) to authenticated;
grant execute on function public.acquire_assignment(uuid) to authenticated;

-- 3) Storage: allow upload + read into the user's own private folder
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

-- 4) Seed sentences (safe, idempotent) so the queue isn't empty
insert into public.sentences (text, language, dialect, category, difficulty, source, status)
select x.text, 'so', x.dialect, 'general', x.difficulty, 'seed', 'active'
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