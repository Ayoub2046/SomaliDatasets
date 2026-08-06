import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'

export default function AdminLogin() {
  const { login } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const loggedUser = await login({ email: form.email.trim(), password: form.password })
      push('Waad ku soo gashay admin-ka! 👋')
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Login wuu ku dambeeyay. Hubi email-ka iyo password-ka.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5 col-lg-4">
          <div className="card shadow-lg brand-ring border-0 p-4 p-md-5">
            <div className="text-center mb-4">
              <span className="brand-ring mx-auto rounded-circle d-grid place-items-center mb-2" style={{ width: 64, height: 64, background: 'rgba(158,254,5,0.15)' }}>
                <i className="bi bi-shield-lock-fill fs-2 text-lime" />
              </span>
              <h4 className="fw-bold mt-2 mb-1">Staff Login</h4>
              <p className="text-muted small mb-0">CaawiyeAI Admin Control Panel</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Email</label>
                <div className="input-group">
                  <span className="input-group-text bg-soft border-secondary border-opacity-25"><i className="bi bi-envelope text-lime" /></span>
                  <input
                    type="email"
                    className="form-control bg-soft text-white border-secondary border-opacity-25"
                    placeholder="admin@caawiyeai.so"
                    value={form.email}
                    onChange={set('email')}
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold">Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-soft border-secondary border-opacity-25"><i className="bi bi-lock text-lime" /></span>
                  <input
                    type="password"
                    className="form-control bg-soft text-white border-secondary border-opacity-25"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set('password')}
                    required
                  />
                </div>
              </div>

              {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

              <button className="btn btn-lime btn-lg w-100 py-2 rounded-pill fw-bold" disabled={busy} type="submit">
                {busy ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-box-arrow-in-right me-2" />Sign in as Admin</>}
              </button>
            </form>

            {/* Quick Demo Hint */}
            <div className="p-3 mt-4 rounded-3 bg-soft border border-secondary border-opacity-25 text-center">
              <div className="micro-title text-lime fw-bold mb-1">Demo Admin Credentials</div>
              <div className="small font-monospace text-white-50">Email: admin@caawiyeai.so</div>
              <div className="small font-monospace text-white-50">Pass: admin123</div>
            </div>

            <p className="text-center small text-muted mt-4 mb-0">
              Regular member? <Link to="/login" className="text-lime text-decoration-none">Go to user login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}