import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { isAdminRole } from '../lib/rbac'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const NavItem = ({ to, label, icon, end }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `nav-link d-flex align-items-center gap-2 ${isActive ? 'active text-lime fw-bold' : ''}`
      }
    >
      <i className={`bi ${icon}`} />
      {label}
    </NavLink>
  )

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <nav className="navbar navbar-expand-lg sticky-top shadow-sm border-bottom" data-bs-theme={theme}>
      <div className="container">
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2 fw-bold">
          <span className="brand-badge">
            <i className="bi bi-mic-fill" />
          </span>
          <span>
            Caawiye<span className="text-lime">AI</span>
          </span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav mx-auto gap-lg-2">
            <li className="nav-item">
              <NavItem to="/" label="Home" icon="bi-house-door" end />
            </li>
            {user && (
              <li className="nav-item">
                <NavItem to="/record" label="Record" icon="bi-mic" />
              </li>
            )}
            <li className="nav-item">
              <NavItem to="/leaderboard" label="Leaderboard" icon="bi-trophy" />
            </li>
            <li className="nav-item">
              <NavItem to="/statistics" label="Statistics" icon="bi-bar-chart" />
            </li>
            {user && isAdminRole(user.role) && (
              <li className="nav-item">
                <NavItem to="/admin" label="Admin" icon="bi-gear" />
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-sm btn-outline-lime d-flex align-items-center gap-2" onClick={toggle} aria-label="Toggle theme">
              <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} />
            </button>

            {user ? (
              <div className="d-flex align-items-center gap-2">
                <Link to="/profile" className="d-flex align-items-center gap-2 text-decoration-none" style={{ color: 'inherit' }}>
                  {user.photo ? (
                    <img src={user.photo} alt={user.username} className="avatar" style={{ width: 34, height: 34 }} />
                  ) : (
                    <span className="avatar" style={{ width: 34, height: 34 }}>
                      {user.username?.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="d-none d-md-inline fw-semibold">{user.username}</span>
                </Link>
                <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={handleLogout} title="Logout">
                  <i className="bi bi-box-arrow-right" />
                  <span className="d-none d-md-inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-lime d-flex align-items-center gap-2">
                <i className="bi bi-box-arrow-in-right" />
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}