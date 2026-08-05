import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
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
  if (!user) return <Navigate to="/login" replace />
  return children
}