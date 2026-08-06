import { useEffect, useState, useMemo } from 'react'
import { data } from '../services/dataService'
import { useAuth } from '../contexts/AuthContext'
import PageHeader from '../components/PageHeader'

const periods = [
  { id: 'weekly', label: 'Usbuucan (Weekly)' },
  { id: 'monthly', label: 'Bishan (Monthly)' },
  { id: 'all', label: 'Dhammaan (All Time)' },
]

export default function Leaderboard() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('all')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    data
      .getLeaderboard(period)
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(
      (r) =>
        r.username?.toLowerCase().includes(q) ||
        r.country?.toLowerCase().includes(q)
    )
  }, [rows, search])

  const top3 = filtered.slice(0, 3)
  const rest = filtered.slice(3)
  const podiumStyle = ['podium-first', 'podium-2nd', 'podium-3rd']
  const medals = ['🥇', '🥈', '🥉']

  const userRankItem = useMemo(() => {
    if (!user) return null
    return rows.find((u) => u.id === user.id)
  }, [rows, user])

  return (
    <div className="container py-5">
      <PageHeader
        icon="bi-trophy"
        title="Leaderboard Bulshada"
        subtitle="Contributors-ka ugu sarreeya ee horumarinaya CaawiyeAI"
        action={
          <div className="btn-group">
            {periods.map((p) => (
              <button
                key={p.id}
                className={`btn btn-sm ${period === p.id ? 'btn-lime fw-bold' : 'btn-outline-lime'}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Personal Rank Callout */}
      {userRankItem && (
        <div className="glass rounded-4 p-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2 border-lime">
          <div className="d-flex align-items-center gap-3">
            <span className="avatar brand-ring" style={{ width: 44, height: 44 }}>
              {user.username?.charAt(0).toUpperCase()}
            </span>
            <div>
              <div className="fw-bold">{user.username} (Adiga)</div>
              <div className="text-muted micro-title">Kaalintaada Leaderboard-ka</div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-4">
            <div className="text-center">
              <div className="micro-title">Rank</div>
              <div className="fs-4 fw-bold text-lime">#{userRankItem.rank}</div>
            </div>
            <div className="text-center">
              <div className="micro-title">Clips</div>
              <div className="fs-4 fw-bold text-white">
                {(userRankItem.score !== undefined ? userRankItem.score : userRankItem.total_submissions || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Podium Top 3 */}
      <div className="row g-4 mb-5 align-items-end justify-content-center">
        {top3.map((u, i) => (
          <div className="col-md-4" key={u.id}>
            <div className={`card text-center p-4 h-100 hover-lift ${i === 0 ? 'order-md-2 podium-first' : podiumStyle[i]}`}>
              <div className="fs-1 floating-element">{medals[i]}</div>
              {u.photo ? (
                <img
                  src={u.photo}
                  alt=""
                  className="avatar mx-auto my-3 brand-ring"
                  style={{ width: 76, height: 76 }}
                />
              ) : (
                <span
                  className="avatar mx-auto my-3 brand-ring"
                  style={{ width: 76, height: 76, fontSize: '1.8rem' }}
                >
                  {u.username?.charAt(0).toUpperCase()}
                </span>
              )}
              <h4 className="fw-bold mb-1 text-truncate">
                {u.username}
                {user && u.id === user.id && <span className="badge text-bg-warning ms-2">You</span>}
              </h4>
              <div className="text-muted small mb-2">{u.country || 'Somalia 🇸🇴'}</div>
              <div className="fs-3 fw-bold text-lime mt-1">
                {(u.score !== undefined ? u.score : u.total_submissions || 0).toLocaleString()}
              </div>
              <div className="micro-title">{period === 'all' ? 'Total Clips' : 'Period Clips'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="card p-4 brand-ring">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <h5 className="fw-bold mb-0">
            <i className="bi bi-list-ol text-lime me-2" />
            Dhammaan Contributors-ka ({filtered.length})
          </h5>
          <div className="input-group input-group-sm style-search" style={{ maxWidth: 280 }}>
            <span className="input-group-text bg-soft border-secondary border-opacity-25">
              <i className="bi bi-search text-muted" />
            </span>
            <input
              type="text"
              className="form-control bg-soft border-secondary border-opacity-25 text-white"
              placeholder="Search contributor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-lime mb-2" />
            <div className="text-muted small">Loading leaderboard...</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-lime table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th># Rank</th>
                  <th>Contributor</th>
                  <th>Waddanka (Country)</th>
                  <th className="text-center">Accepted</th>
                  <th className="text-end">{period === 'all' ? 'Total Clips' : 'Period Clips'}</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((u) => (
                  <tr key={u.id} className={user && u.id === user.id ? 'table-active' : ''}>
                    <td className="fw-bold text-lime fs-6">#{u.rank}</td>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        {u.photo ? (
                          <img src={u.photo} alt="" className="avatar" style={{ width: 38, height: 38 }} />
                        ) : (
                          <span className="avatar" style={{ width: 38, height: 38 }}>
                            {u.username?.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <span className="fw-semibold">{u.username}</span>
                          {user && u.id === user.id && (
                            <span className="badge text-bg-warning ms-2">You</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{u.country || '—'}</td>
                    <td className="text-center text-muted">{(u.accepted || 0).toLocaleString()}</td>
                    <td className="text-end fw-bold text-lime fs-6">
                      {(u.score !== undefined ? u.score : u.total_submissions || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      Ma jiraan contributors la helay.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}