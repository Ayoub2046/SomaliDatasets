// Rate limiting for the hidden admin login surface.
// Counts failures per (ip, email) in a window using the
// admin_login_attempts table (service-role path).

const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return '0.0.0.0'
}

// Returns { allowed, remaining, retryAfterMs }
export async function checkRateLimit(supabase, ip, email) {
  const { data, error } = await supabase.rpc('recent_admin_login_failures', {
    p_ip: ip,
    p_email: email,
    p_window: `${WINDOW_MS} ms`,
  })
  if (error) {
    // Fail open only when the RPC is unavailable (e.g. migrations not run).
    return { allowed: true, remaining: MAX_FAILURES, retryAfterMs: 0, degraded: true }
  }
  const failures = data || 0
  const remaining = Math.max(0, MAX_FAILURES - failures)
  if (failures >= MAX_FAILURES) {
    return { allowed: false, remaining: 0, retryAfterMs: WINDOW_MS }
  }
  return { allowed: true, remaining, retryAfterMs: 0 }
}

export async function recordAttempt(supabase, ip, email, success) {
  await supabase.from('admin_login_attempts').insert({ ip, email, success })
  // Opportunistic purge of old rows.
  await supabase.rpc('purge_admin_login_attempts')
}