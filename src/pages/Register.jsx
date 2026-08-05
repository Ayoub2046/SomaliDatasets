import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'

export default function Register() {
  const { register } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords-ka isma waafaqsana.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await register({ username: form.username, email: form.email, password: form.password })
      push('Diiwaangeliinta way ku guuleysatay! ✨')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Diiwaangeliinti ayaa ku dambeysay.')
    } finally {
      setBusy(false)
    }
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
              <h4 className="fw-bold mt-3 mb-1">Diiwaangelin</h4>
              <p className="text-muted small mb-0">Ku biir bulshada CaawiyeAI — waa bilaash.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Username</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-person" /></span>
                  <input type="text" className="form-control" placeholder="Tusaale: Ayuob" value={form.username} onChange={set('username')} required />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Email</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-envelope" /></span>
                  <input type="email" className="form-control" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
                </div>
              </div>
              <div className="row g-3 mb-4">
                <div className="col">
                  <label className="form-label small fw-semibold">Password</label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-lock" /></span>
                    <input type="password" className="form-control" placeholder="Min 6 xaraf" value={form.password} onChange={set('password')} minLength={6} required />
                  </div>
                </div>
                <div className="col">
                  <label className="form-label small fw-semibold">Confirm</label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-lock-fill" /></span>
                    <input type="password" className="form-control" placeholder="Markale" value={form.confirm} onChange={set('confirm')} required />
                  </div>
                </div>
              </div>

              {error && <div className="alert alert-danger py-2 small">{error}</div>}

              <button className="btn btn-lime w-100 py-2" disabled={busy} type="submit">
                {busy ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-person-plus me-2" />Register</>}
              </button>
            </form>

            <p className="text-center small text-muted mt-4 mb-0">
              Already have account? <Link to="/login" className="text-lime text-decoration-none fw-bold">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}