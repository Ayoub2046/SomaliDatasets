import { useEffect, useState } from 'react'
import { data } from '../../services/dataService'
import PageHeader from '../../components/PageHeader'
import { getBadges } from '../../services/dataService'

export default function AdminUsers() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    data.getUsers().then(setRows).finally(() => setLoading(false))
  }, [])

  const filtered = rows.filter(
    (u) =>
      !query.trim() ||
      u.username?.toLowerCase().includes(query.toLowerCase()) ||
      u.country?.toLowerCase().includes(query.toLowerCase()) ||
      u.email?.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div>
      <PageHeader icon="bi-people" title="Users" subtitle={`${rows.length} total contributors`} />

      <div className="card p-3">
        <div className="input-group input-group-sm w-auto mb-3">
          <span className="input-group-text"><i className="bi bi-search" /></span>
          <input className="form-control" placeholder="Search users..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-lime" /></div>
        ) : (
          <div className="table-responsive">
            <table className="table table-lime align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Country</th>
                  <th>Role</th>
                  <th className="text-center">Submitted</th>
                  <th className="text-center">Accepted</th>
                  <th className="text-center">Rejected</th>
                  <th>Badges</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const badges = getBadges(u.total_submissions || 0)
                  const earned = badges.filter((b) => b.earned).length
                  return (
                    <tr key={u.id}>
                      <td className="text-muted">{i + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {u.photo ? (
                            <img src={u.photo} alt="" className="avatar" style={{ width: 36, height: 36 }} />
                          ) : (
                            <span className="avatar" style={{ width: 36, height: 36 }}>{u.username?.charAt(0)}</span>
                          )}
                          <div>
                            <div className="fw-semibold">{u.username}</div>
                            <div className="text-muted small">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted">{u.country || '—'}</td>
                      <td>
                        {u.role === 'admin' ? (
                          <span className="badge text-bg-warning">Admin</span>
                        ) : (
                          <span className="badge text-bg-secondary">Member</span>
                        )}
                      </td>
                      <td className="text-center fw-bold">{u.total_submissions || 0}</td>
                      <td className="text-center text-lime fw-bold">{u.accepted || 0}</td>
                      <td className="text-center text-danger fw-bold">{u.rejected || 0}</td>
                      <td>
                        <span className="badge text-bg-light">
                          {earned === 0 ? '—' : badges.filter((b) => b.earned).map((b) => b.icon).join(' ')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}