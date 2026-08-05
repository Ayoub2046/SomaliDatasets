import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { data, getBadges } from '../services/dataService'
import { useToast } from '../components/ui/Toast'
import StatCard from '../components/StatCard'

export default function Profile() {
  const { user, refresh } = useAuth()
  const { push } = useToast()
  const [rank, setRank] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ username: '', country: '', language: '', bio: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({ username: user.username || '', country: user.country || '', language: user.language || '', bio: user.bio || '' })
      data.getLeaderboard('all').then((lb) => {
        const found = lb.find((u) => u.id === user.id)
        if (found) setRank(found.rank)
      }).catch(() => {})
    }
  }, [user])

  const total = user?.total_submissions || 0
  const badges = getBadges(total)
  const joined = user?.joined_at ? new Date(user.joined_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' }) : '—'

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await data.updateProfile(user.id, form)
      await refresh()
      push('Profile-ka ayaa la cusboonaysiiyay.')
      setEditing(false)
    } catch (err) {
      push(err.message || 'Cusboonaysiinta ayaa ku dambeysay.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container py-5">
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card p-4 text-center h-100">
            <div className="mb-3">
              {user?.photo ? (
                <img src={user.photo} alt="" className="avatar brand-ring mx-auto" style={{ width: 96, height: 96 }} />
              ) : (
                <span className="avatar brand-ring mx-auto" style={{ width: 96, height: 96, fontSize: '2rem' }}>
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h4 className="fw-bold mb-1">{user?.username}</h4>
            <div className="badge text-bg-light mt-1 mb-3">{user?.role === 'admin' ? 'Admin' : 'Contributor'}</div>
            <div className="row text-center g-2 mb-3">
              <div className="col-4">
                <div className="fs-4 fw-bold text-lime">#{rank}</div>
                <div className="micro-title">Rank</div>
              </div>
              <div className="col-4">
                <div className="fs-4 fw-bold text-lime">{total.toLocaleString()}</div>
                <div className="micro-title">Clips</div>
              </div>
              <div className="col-4">
                <div className="fs-4 fw-bold text-lime">{(user?.accepted || 0).toLocaleString()}</div>
                <div className="micro-title">Accepted</div>
              </div>
            </div>
            <div className="vstack gap-2 text-start small">
              {[
                ['bi-geo-alt', user?.country || 'Somalia'],
                ['bi-translate', user?.language || 'Somali'],
                ['bi-calendar', joined],
              ].map(([icon, text]) => (
                <div key={text} className="d-flex align-items-center gap-2 text-muted">
                  <i className={`bi ${icon} text-lime`} />
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-outline-lime w-100 mt-3" onClick={() => setEditing((v) => !v)}>
              <i className="bi bi-pencil me-1" /> Edit Profile
            </button>
          </div>
        </div>

        <div className="col-lg-8">
          {!editing ? (
            <div className="vstack gap-4">
              <div className="row g-3">
                <div className="col-6 col-md-3">
                  <StatCard icon="bi-collection" label="Submitted" value={total.toLocaleString()} accent="lime" />
                </div>
                <div className="col-6 col-md-3">
                  <StatCard icon="bi-check2-circle" label="Accepted" value={(user?.accepted || 0).toLocaleString()} accent="leaf" />
                </div>
                <div className="col-6 col-md-3">
                  <StatCard icon="bi-x-circle" label="Rejected" value={(user?.rejected || 0).toLocaleString()} accent="gray" />
                </div>
                <div className="col-6 col-md-3">
                  <StatCard icon="bi-award" label="Badges" value={badges.filter((b) => b.earned).length} accent="lily" />
                </div>
              </div>

              <div className="card p-4">
                <h6 className="fw-bold mb-3"><i className="bi bi-award text-lime me-2" />Badges</h6>
                <div className="row g-2">
                  {badges.map((b) => (
                    <div className="col-6 col-md-3" key={b.name}>
                      <div className={`badge-card text-center p-3 rounded-3 border ${b.earned ? '' : 'badge-locked'}`}>
                        <div className="badge-gem">{b.icon}</div>
                        <div className="fw-bold small mt-1">{b.name}</div>
                        <div className="text-muted small">{b.min.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-4">
              <h5 className="fw-bold mb-4">Edit Profile</h5>
              <form onSubmit={save}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Username</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-person" /></span>
                      <input className="form-control" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Country</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-geo-alt" /></span>
                      <input className="form-control" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Language</label>
                    <input className="form-control" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Bio</label>
                    <textarea className="form-control" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                  </div>
                </div>
                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-lime" disabled={busy} type="submit">
                    {busy ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}