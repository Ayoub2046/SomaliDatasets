-- =============================================================
-- EMPTY · Reset the whole system to an empty production state.
-- Keeps roles/permissions/achievements seeded; wipes all data.
-- Run in the Supabase SQL Editor.
-- =============================================================

truncate table
  public.audit_logs,
  public.dataset_sync_queue,
  public.approvals,
  public.validation_results,
  public.recordings,
  public.assignments,
  public.notifications,
  public.user_achievements,
  public.daily_progress,
  public.sentences,
  public.admin_login_attempts,
  public.profiles
cascade;

-- Reset the leaderboard materialized view.
refresh materialized view public.leaderboard_daily;

-- Optional: also clear uploaded audio from storage. Confirm before running.
-- delete from storage.objects where bucket_id in
--   ('pending-recordings','approved-recordings','rejected-recordings');