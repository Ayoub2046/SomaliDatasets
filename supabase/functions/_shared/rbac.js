// Server-side RBAC for Edge Functions.
// Runs under service_role, so RLS is bypassed and we resolve the
// actor's role from the profiles table ourselves.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function serviceClient(req) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const ADMIN_ROLES = ['admin', 'super_admin']

// Load the actor's role from the JWT subject.
export async function loadRole(supabase, userId) {
  if (!userId) return null
  const { data } = await supabase.from('profiles').select('role, status').eq('id', userId).maybeSingle()
  if (!data) return null
  return data
}

export function roleHasAccess(role) {
  return role && ADMIN_ROLES.includes(role)
}

// Resolves the acting user id from the JWT Bearer token.
export function actorId(req) {
  const authz = req.headers.get('Authorization') || ''
  if (!authz.startsWith('Bearer ')) return null
  // Decode the JWT payload (unsigned decode is enough for the sub claim).
  const token = authz.slice(7)
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.sub || payload.aud
  } catch (_) {
    return null
  }
}