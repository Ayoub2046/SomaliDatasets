// Cloudflare Turnstile (invisible) server-side verification.
// Conforming to the standard siteverify API.

export async function verifyTurnstile(token) {
  const secret = Deno.env.get('TURNSTILE_SECRET')
  // Dev/test mode: allow when no secret is configured so local
  // work isn't blocked. Production must set TURNSTILE_SECRET.
  if (!secret) return { ok: true, reason: 'no-secret-configured' }

  if (!token) return { ok: false, reason: 'missing-token' }

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
  })
  const data = await res.json()
  return { ok: Boolean(data.success), reason: data.errorCodes?.[0] || 'turnstile-failed' }
}