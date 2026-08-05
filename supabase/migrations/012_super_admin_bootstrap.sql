-- =============================================================
-- 012 · Super-admin bootstrap + guarded promotion
--
-- The first super_admin can be claimed while zero super_admins
-- exist (bootstrap, e.g. from the SQL console or a guarded Edge
-- Function). After that, only an existing super_admin may promote
-- or demote. Edge Functions pass the acting user id explicitly,
-- since auth.uid() is null under service_role.
-- =============================================================

-- Guarded promotion. p_actor_id may be null ONLY during bootstrap
-- (no super_admin exists yet); otherwise the actor must be one.
create or replace function public.promote_to_super_admin(p_actor_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_super_count int;
  v_actor_role public.app_role;
begin
  select count(*) into v_super_count
    from public.profiles where role = 'super_admin' and status = 'active';

  if v_super_count > 0 then
    select role into v_actor_role from public.profiles where id = p_actor_id;
    if v_actor_role is null then
      raise exception 'Actor not found';
    end if;
    if v_actor_role <> 'super_admin' then
      raise exception 'Only an existing super_admin may promote users';
    end if;
  end if;

  update public.profiles
     set role = 'super_admin'
   where id = p_user_id
     and status = 'active';

  if not found then
    raise exception 'Target user not found or inactive';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after)
  values (p_actor_id, 'profile.promote_super_admin', 'profiles', p_user_id,
          jsonb_build_object('target_role', 'super_admin'));

  return true;
end $$;

-- Demote is super_admin-only (actor must be an existing super_admin).
create or replace function public.demote_from_super_admin(p_actor_id uuid, p_user_id uuid, p_target_role public.app_role)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_actor_role public.app_role;
  v_super_count int;
begin
  if p_target_role = 'super_admin' then
    raise exception 'Target role cannot be super_admin when demoting';
  end if;

  select role into v_actor_role from public.profiles where id = p_actor_id;
  if v_actor_role is null then
    raise exception 'Actor not found';
  end if;
  if v_actor_role <> 'super_admin' then
    raise exception 'Only a super_admin may demote users';
  end if;

  -- Never allow removing the last active super_admin.
  select count(*) into v_super_count
    from public.profiles where role = 'super_admin' and status = 'active' and id <> p_user_id;
  if v_super_count = 0 then
    raise exception 'Cannot demote the last active super_admin';
  end if;

  update public.profiles set role = p_target_role where id = p_user_id;

  if not found then
    raise exception 'Target user not found';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after)
  values (p_actor_id, 'profile.demote_super_admin', 'profiles', p_user_id,
          jsonb_build_object('target_role', p_target_role));

  return true;
end $$;

-- Direct clients can never call these; only the service_role path
-- (Edge Functions) executes them.
revoke execute on function public.promote_to_super_admin(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.demote_from_super_admin(uuid, uuid, public.app_role) from public, anon, authenticated;
grant execute on function public.promote_to_super_admin(uuid, uuid) to service_role;
grant execute on function public.demote_from_super_admin(uuid, uuid, public.app_role) to service_role;
