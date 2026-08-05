import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { DEMO_ADMIN, IS_LIVE } from '../config/config'

export default function Login() {
  const { login, social } = useAuth()
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
      await login(form)
      push('Waad soo dhawoowday! ✨')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login wuu ku dambeeyay.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSocial(provider) {
    setBusy(true)
    setError('')
    try {
      await social(provider)
      if (!IS_LIVE) {
        push('Waad soo gashay {provider} demo-ka!'.replace('{provider}', provider))
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function fillDemo() {
    setForm({ email: DEMO_ADMIN.email, password: DEMO_ADMIN.password })
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-lg border-0 p-4 p-md-5">
            <div className="text-center mb-4">
              <span className="brand-badge mx-auto" style={{ width: 56, height: 56, fontSize: '1.5rem' }}>
                <i className="bi bi-mic-fill" />
              </span>
              <h4 className="fw-bold mt-3 mb-1">Ku soo gal CaawiyeAI</h4>
              <p className="text-muted small mb-0">Samee cod, caawina AI-da Af-Soomaaliga.</p>
            </div>

            {!IS_LIVE && (
              <button className="btn btn-sm btn-outline-lime mb-3" onClick={fillDemo} type="button">
                <i className="bi bi-magic me-1" /> Tijaabi account admin-ka (auto-fill)
              </button>
            )}

            <div className="d-grid gap-2 mb-3">
              <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2" onClick={() => handleSocial('google')} disabled={busy} type="button">
                <i className="bi bi-google" /> Google
              </button>
              <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2" onClick={() => handleSocial('github')} disabled={busy} type="button">
                <i className="bi bi-github" /> GitHub
              </button>
            </div>

            <div className="d-flex align-items-center gap-3 my-3">
              <hr className="flex-grow-1 opacity-25" />
              <span className="micro-title">ama email</span>
              <hr className="flex-grow-1 opacity-25" />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Email</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-envelope" /></span>
                  <input type="email" className="form-control" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
                </div>
              </div>
              <div className="mb-4">
                <div className="d-flex justify-content-between">
                  <label className="form-label small fw-semibold">Password</label>
                  <a href="#" className="small text-lime text-decoration-none">Forgot?</a>
                </div>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-lock" /></span>
                  <input type="password" className="form-control" placeholder="••••••••" value={form.password} onChange={set('password')} required />
                </div>
              </div>

              {error && <div className="alert alert-danger py-2 small">{error}</div>}

              <button className="btn btn-lime w-100 py-2" disabled={busy} type="submit">
                {busy ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-box-arrow-in-right me-2" />Login</>}
              </button>
            </form>

            <p className="text-center small text-muted mt-4 mb-0">
              Have no account? <Link to="/register" className="text-lime text-decoration-none fw-bold">Register</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}