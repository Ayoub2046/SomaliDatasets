import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Footer() {
  const year = new Date().getFullYear()
  const { user } = useAuth()
  return (
    <footer className="border-top mt-auto pt-4 pb-3" style={{ background: 'var(--bs-body-bg)' }}>
      <div className="container">
        <div className="row g-4 align-items-center">
          <div className="col-md-4">
            <div className="d-flex align-items-center gap-2 fw-bold fs-5">
              <span className="brand-badge">
                <i className="bi bi-mic-fill" />
              </span>
              Caawiye<span className="text-lime">AI</span>
            </div>
            <p className="text-muted mt-2 mb-0 small">
              Guduraya Codka Soomaaliga si AI-da Af-Soomaaliga u noqoto mid xor iyo xaq ah.
            </p>
          </div>
          <div className="col-6 col-md-2">
            <h6 className="micro-title">Platform</h6>
            <ul className="list-unstyled small">
              <li><Link className="text-reset text-decoration-none" to="/record">Record</Link></li>
              <li><Link className="text-reset text-decoration-none" to="/leaderboard">Leaderboard</Link></li>
              <li><Link className="text-reset text-decoration-none" to="/statistics">Statistics</Link></li>
            </ul>
          </div>
          <div className="col-6 col-md-2">
            <h6 className="micro-title">Account</h6>
            <ul className="list-unstyled small">
              {user ? (
                <li><Link className="text-reset text-decoration-none" to="/profile">Profile</Link></li>
              ) : (
                <>
                  <li><Link className="text-reset text-decoration-none" to="/login">Login</Link></li>
                  <li><Link className="text-reset text-decoration-none" to="/register">Register</Link></li>
                </>
              )}
            </ul>
          </div>
          <div className="col-md-4 text-md-end">
            <div className="d-flex gap-3 justify-content-md-end">
              <a href="#" aria-label="GitHub" className="text-reset fs-5"><i className="bi bi-github" /></a>
              <a href="#" aria-label="X" className="text-reset fs-5"><i className="bi bi-twitter-x" /></a>
              <a href="#" aria-label="Email" className="text-reset fs-5"><i className="bi bi-envelope" /></a>
            </div>
            <small className="text-muted d-block mt-2">Dataset: cc-by-4.0 · Audio: cc0</small>
          </div>
        </div>
        <hr className="my-3 opacity-25" />
        <div className="d-flex flex-wrap justify-content-between gap-2 small text-muted">
          <span>© {year} CaawiyeAI · Somali Voice Platform</span>
          <span>
            <i className="bi bi-heart-fill text-lime" /> Dhisayo bulshadu, loo adeeg aadduun.
          </span>
        </div>
      </div>
    </footer>
  )
}