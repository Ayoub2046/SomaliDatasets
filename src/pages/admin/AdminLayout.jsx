import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const links = [
  { to: '/admin', label: 'Overview', icon: 'bi-speedometer2', end: true },
  { to: '/admin/datasets', label: 'Datasets', icon: 'bi-collection' },
  { to: '/admin/sentences', label: 'Sentences', icon: 'bi-fonts' },
  { to: '/admin/users', label: 'Users', icon: 'bi-people' },
  { to: '/admin/charts', label: 'Charts & Analytics', icon: 'bi-pie-chart' },
  { to: '/admin/settings', label: 'Settings & Export', icon: 'bi-gear' },
]

export default function AdminLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="brand-ring d-grid place-items-center rounded-4 p-2" style={{ background: 'rgba(158,254,5,0.1)' }}>
          <i className="bi bi-shield-lock fs-3 text-lime" />
        </div>
        <div className="flex-grow-1">
          <h4 className="fw-bold mb-0">Admin Dashboard</h4>
          <div className="text-muted small">Waxaad ku mas'uul tahay guud ahaan mashruuca — {user?.username}</div>
        </div>
        <button className="btn btn-outline-lime" onClick={() => navigate('/dashboard')}>
          <i className="bi bi-arrow-left me-1" /> User View
        </button>
      </div>

      <div className="row g-4">
        {/* Sidebar */}
        <div className="col-lg-2 col-md-3">
          <div className="card p-2 sticky-top">
            <nav className="nav flex-column gap-1" style={{ top: 80, position: 'sticky' }}>
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `d-flex align-items-center gap-2 nav-link rounded-3 px-3 py-2 ${isActive ? 'active bg-soft text-lime fw-bold' : 'text-reset'}`
                  }
                >
                  <i className={`bi ${l.icon}`} />
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="col-lg-9 col-md-9">
          <Outlet />
        </div>
      </div>
    </div>
  )
}