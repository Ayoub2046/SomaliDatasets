-- =============================================================
-- ADMIN · Create the super-admin account (run ONCE).
--
-- 1. Replace the email + password below with the real admin.
-- 2. Run this in the Supabase SQL Editor.
-- =============================================================

do $$
declare
  v_admin_id uuid;
begin
  -- Create the auth user (email/password login).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@caawiyeai.so',                                -- ← change email
    crypt('ChangeMe_Admin123!', gen_salt('bf')),          -- ← change password
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"username":"Admin"}',
    now(), now()
  )
  returning id into v_admin_id;

  -- Ensure the profile row exists (the trigger normally does this,
  -- but direct inserts need it explicitly).
  insert into public.profiles (id, username, email, country, language, role, status)
  values (v_admin_id, 'Admin', 'admin@caawiyeai.so', 'Somalia', 'so', 'super_admin', 'active')
  on conflict (id) do update set role = 'super_admin', status = 'active';

  raise notice 'Super admin created with id %', v_admin_id;
end $$;

-- Verify
select id, email, role, status from public.profiles where role = 'super_admin';
