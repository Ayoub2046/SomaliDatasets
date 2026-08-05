// Hidden admin login. Rate-limited per (ip, email) + Turnstile.
// On success returns a session that the client installs via
// supabase.auth.setSession. Only admin/super_admin roles pass.

import { handleOptions, jsonResponse } from '../_shared/cors.js'
import { serviceClient } from '../_shared/rbac.js'
import { verifyTurnstile } from '../_shared/turnstile.js'
import { checkRateLimit, recordAttempt, clientIp } from '../_shared/ratelimit.js'

Deno.serve(async (req) => {
  const cors = handleOptions(req)
  if (cors) return cors

  const ip = clientIp(req)

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405)
    }

    let body
    try {
      body = await req.json()
    } catch (_) {
      return jsonResponse({ error: 'Invalid JSON' }, 400)
    }

    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const turnstileToken = String(body.turnstileToken || '')

    if (!email || !password) {
      return jsonResponse({ error: 'Email and password required' }, 400)
    }

    // 1. Bot protection
    const captcha = await verifyTurnstile(turnstileToken)
    if (!captcha.ok) {
      return jsonResponse({ error: 'Bot check failed' }, 403)
    }

    const supabase = serviceClient(req)

    // 2. Rate limit
    const rl = await checkRateLimit(supabase, ip, email)
    if (!rl.allowed) {
      return jsonResponse(
        { error: 'Too many attempts. Try again later.', retryAfterMs: rl.retryAfterMs },
        429,
      )
    }

    // 3. Authenticate with the service role (bypasses RLS / public login)
    const { data, error } = await supabase.auth.admin.signInWithPassword({ email, password })

    if (error || !data.user) {
      await recordAttempt(supabase, ip, email, false)
      return jsonResponse({ error: 'Invalid credentials' }, 401)
    }

    // 4. Role gate
    const profile = await loadRoleProfile(supabase, data.user.id)
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      await recordAttempt(supabase, ip, email, false)
      return jsonResponse({ error: 'Invalid credentials' }, 401)
    }

    await recordAttempt(supabase, ip, email, true)

    return jsonResponse({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      profile: {
        id: profile.id,
        username: profile.username,
        role: profile.role,
      },
    })
  } catch (err) {
    console.error('admin-auth error', err)
    return jsonResponse({ error: 'Internal error' }, 500)
  }
})

async function loadRoleProfile(supabase, userId) {
  const { data } = await supabase.from('profiles').select('id, username, role, status').eq('id', userId).maybeSingle()
  if (!data || data.status !== 'active') return null
  return data
}
