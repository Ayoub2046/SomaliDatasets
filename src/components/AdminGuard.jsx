import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isAdminRole } from '../lib/rbac'

// Guards every /admin route. Unauthenticated staff are sent to the
// hidden /admin/login; authenticated non-admins bounce to the dashboard.
export default function AdminGuard({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-lime" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/admin/login" replace />
  if (!isAdminRole(user.role)) return <Navigate to="/dashboard" replace />
  return children
}