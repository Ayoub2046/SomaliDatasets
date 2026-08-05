import { useEffect, useState } from 'react'
import { data } from '../services/dataService'
import { useAuth } from '../contexts/AuthContext'
import PageHeader from '../components/PageHeader'

const periods = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'all', label: 'All Time' },
]

export default function Leaderboard() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('all')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    data.getLeaderboard(period).then(setRows).catch(() => {}).finally(() => setLoading(false))
  }, [period])

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)
  const podiumStyle = ['podium-first', 'podium-2nd', 'podium-3rd']
  const medal = ['🥇', '🥈', '🥉']

  return (
    <div className="container py-5">
      <PageHeader
        icon="bi-trophy"
        title="Leaderboard"
        subtitle="Contributors-ka ugu sarreeya ee CaawiyeAI"
        action={
          <div className="btn-group">
            {periods.map((p) => (
              <button
                key={p.id}
                className={`btn btn-sm ${period === p.id ? 'btn-lime' : 'btn-outline-lime'}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Podium */}
      <div className="row g-3 mb-4 align-items-end">
        {top3.map((u, i) => (
          <div className="col-md-4" key={u.id}>
            <div className={`card text-center p-4 h-100 ${i === 0 ? 'order-md-2 podium-first' : podiumStyle[i]}`}>
              <div className="fs-1">{medal[i]}</div>
              {u.photo ? (
                <img src={u.photo} alt="" className="avatar mx-auto my-2 brand-ring" style={{ width: 72, height: 72 }} />
              ) : (
                <span className="avatar mx-auto my-2 brand-ring" style={{ width: 72, height: 72, fontSize: '1.6rem' }}>
                  {u.username?.charAt(0).toUpperCase()}
                </span>
              )}
              <h5 className="fw-bold mb-0">
                {u.username}
                {user && u.id === user.id && <span className="badge text-bg-warning ms-1">You</span>}
              </h5>
              <div className="text-muted small">{u.country || '—'}</div>
              <div className="mt-2 fs-5 fw-bold text-lime">
                {u.score !== undefined ? u.score.toLocaleString() : (u.total_submissions || 0).toLocaleString()}
              </div>
              <div className="micro-title">{period === 'all' ? 'Total Clips' : 'Clips in period'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card p-4">
        <h6 className="fw-bold mb-3">
          <i className="bi bi-list-ol text-lime me-2" />
          {rows.length} contributors
        </h6>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-lime" />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-lime table-hover align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Country</th>
                  <th className="text-center">Accepted</th>
                  <th className="text-end">{period === 'all' ? 'Total Clips' : 'Period Clips'}</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((u) => (
                  <tr key={u.id} className={user && u.id === user.id ? 'table-primary' : ''}>
                    <td className="fw-bold text-lime">{u.rank}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {u.photo ? (
                          <img src={u.photo} alt="" className="avatar" style={{ width: 36, height: 36 }} />
                        ) : (
                          <span className="avatar" style={{ width: 36, height: 36 }}>{u.username?.charAt(0)}</span>
                        )}
                        <span>
                          <span className="fw-semibold">{u.username}</span>
                          {user && u.id === user.id && <span className="badge text-bg-warning ms-1">You</span>}
                        </span>
                      </div>
                    </td>
                    <td className="text-muted">{u.country || '—'}</td>
                    <td className="text-center text-muted">{(u.accepted || 0).toLocaleString()}</td>
                    <td className="text-end fw-bold">{(u.score !== undefined ? u.score : u.total_submissions || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}