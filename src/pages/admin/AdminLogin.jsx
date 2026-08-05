import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { supabase, IS_LIVE } from '../../lib/supabase'
import { DEMO_ADMIN } from '../../config/config'

// Hidden admin entry point. Deliberately low-profile: no link from the
// landing page, no social/register affordances, rate-limited server-side.
export default function AdminLogin() {
  const { login, refresh } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const tokenRef = useRef('')
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
    if (!IS_LIVE || !siteKey || typeof window === 'undefined' || !window.turnstile) return
    window.turnstile.render(document.getElementById('turnstile-widget'), {
      sitekey: siteKey,
      size: 'invisible',
      callback: (token) => {
        tokenRef.current = token
      },
    })
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (!IS_LIVE) {
        // Demo mode: use the demo admin account against the mock backend.
        await login({ email: DEMO_ADMIN.email, password: DEMO_ADMIN.password })
        push('Waad ku soo gashay admin-ka demo-ka!')
        navigate('/admin', { replace: true })
        return
      }
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { email: form.email, password: form.password, turnstileToken: tokenRef.current },
      })
      if (error) throw new Error(error.message || 'Admin login failed')
      if (!data?.session) throw new Error('Admin login failed')

      await supabase.auth.setSession(data.session)
      await refresh()
      push('Waad ku soo gashay admin-ka!')
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Login wuu ku dambeeyay.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5 col-lg-4">
          <div className="card shadow-lg border-0 p-4 p-md-5">
            <div className="text-center mb-4">
              <span className="brand-badge mx-auto" style={{ width: 56, height: 56, fontSize: '1.5rem' }}>
                <i className="bi bi-shield-lock-fill" />
              </span>
              <h4 className="fw-bold mt-3 mb-1">Staff Login</h4>
              <p className="text-muted small mb-0">Restricted area. Authorized personnel only.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Email</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-envelope" /></span>
                  <input type="email" className="form-control" placeholder="staff@caawiye.ai" value={form.email} onChange={set('email')} required />
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label small fw-semibold">Password</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-lock" /></span>
                  <input type="password" className="form-control" placeholder="••••••••" value={form.password} onChange={set('password')} required />
                </div>
              </div>

              <div id="turnstile-widget" />

              {error && <div className="alert alert-danger py-2 small">{error}</div>}

              <button className="btn btn-lime w-100 py-2" disabled={busy} type="submit">
                {busy ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-box-arrow-in-right me-2" />Sign in</>}
              </button>
            </form>

            <p className="text-center small text-muted mt-4 mb-0">
              Regular member? <Link to="/login" className="text-lime text-decoration-none">Go to user login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}