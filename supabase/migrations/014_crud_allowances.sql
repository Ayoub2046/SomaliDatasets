-- =============================================================
-- 014 · Client CRUD allowances for the live web app
--
-- The app now reads/writes everything from Postgres directly.
-- These policies let authenticated members:
--   · submit a recording (their own)
--   · update/delete their own recordings
-- Staff can approve/reject via apply_assignment/apply_approval.
-- =============================================================

-- ---------- Recordings: owner CRUD ----------
create policy "recordings owner insert" on public.recordings
  for insert with check (auth.uid() = user_id);

create policy "recordings owner update" on public.recordings
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "recordings owner or staff delete" on public.recordings
  for delete using (auth.uid() = user_id or public.has_permission('recordings.approve'));

-- Allow authenticated reviewers/admins to run apply_approval through the UI.
grant execute on function public.apply_approval(uuid, text, text, uuid) to authenticated;
grant execute on function public.acquire_assignment(uuid) to authenticated;

-- ---------- Storage: authenticated upload to own private folder ----------
-- Users may upload only under pending-recordings/<their-uid>/ and read it back.
create policy "pending bucket allow own upload" on storage.objects
  for insert with check (
    bucket_id = 'pending-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pending bucket allow own read" on storage.objects
  for select using (
    bucket_id = 'pending-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );