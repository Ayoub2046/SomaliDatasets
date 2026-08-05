import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { data, getBadges } from '../services/dataService'
import StatCard from '../components/StatCard'

export default function Dashboard() {
  const { user, refresh } = useAuth()
  const [stats, setStats] = useState(null)
  const [mine, setMine] = useState([])
  const [rank, setRank] = useState('—')

  useEffect(() => {
    data.getStats().then(setStats).catch(() => {})
    if (user) {
      data.getLeaderboard('all').then((lb) => {
        const found = lb.find((u) => u.id === user.id)
        if (found) setRank(found.rank)
      }).catch(() => {})
      data.getDatasets({ userId: user.id, limit: 6 }).then(setMine).catch(() => {})
    }
  }, [user])

  const total = user?.total_submissions || 0
  const badges = getBadges(total)

  return (
    <div className="container py-5">
      {/* Welcome */}
      <div className="glass rounded-4 p-4 mb-4 brand-ring d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-3">
          {user?.photo ? (
            <img src={user.photo} alt="" className="avatar" style={{ width: 56, height: 56 }} />
          ) : (
            <span className="avatar" style={{ width: 56, height: 56, fontSize: '1.5rem' }}>
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h4 className="fw-bold mb-0">Welcome, {user?.username} 👋</h4>
            <div className="text-muted small">Wakhtigii aad soo saari lahayd codkaaga soomaaliga!</div>
          </div>
        </div>
        <div className="text-center text-md-end">
          <div className="micro-title">Rank</div>
          <div className="fs-3 fw-bold text-lime">#{rank}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard icon="bi-collection" label="Datasets Submitted" value={total.toLocaleString()} accent="lime" />
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

      {/* Action + badges */}
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card p-4 h-100">
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="brand-ring d-grid place-items-center rounded-4 p-2" style={{ background: 'rgba(158,254,5,0.1)' }}>
                <i className="bi bi-mic-fill fs-4 text-lime" />
              </div>
              <div>
                <h5 className="fw-bold mb-0">Guud ahaan: Ku duub</h5>
                <div className="text-muted small">Dhallaan jumlad, duub coadkaaga oo gudbi.</div>
              </div>
            </div>
            <Link to="/record" className="btn btn-lime btn-lg w-100 py-3">
              <i className="bi bi-mic me-2" /> Bilow Duubista
            </Link>

            <hr className="my-4" />
            <h6 className="micro-title mb-3">Waxqabadkii ugu dambeeyay</h6>
            {mine.length === 0 ? (
              <div className="text-muted small text-center py-3">
                <i className="bi bi-inbox me-1" /> Wali ma aad duubin. Bilow marka hore!
              </div>
            ) : (
              <ul className="list-group list-group-flush bg-transparent">
                {mine.map((d) => (
                  <li key={d.id} className="list-group-item bg-transparent px-0 d-flex justify-content-between gap-2">
                    <span className="small text-truncate">{d.sentence}</span>
                    <span className={`badge text-bg-${statusBadge(d.status)}`}>{d.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-award text-lime me-2" />Badges</h6>
            <div className="vstack gap-2">
              {badges.map((b) => (
                <div key={b.name} className={`badge-card d-flex align-items-center gap-3 p-2 rounded-3 bg-soft ${b.earned ? '' : 'badge-locked'}`}>
                  <span className="badge-gem">{b.icon}</span>
                  <div className="flex-grow-1">
                    <div className="fw-bold small">{b.name}</div>
                    <div className="text-muted small">{b.min.toLocaleString()} recordings</div>
                  </div>
                  {b.earned ? <i className="bi bi-patch-check-fill text-lime" /> : <i className="bi bi-lock-fill text-muted" />}
                </div>
              ))}
            </div>
            <Link to="/profile" className="btn btn-outline-lime w-100 mt-4">
              <i className="bi bi-person me-2" />View Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function statusBadge(s) {
  if (s === 'accepted') return 'success'
  if (s === 'rejected') return 'danger'
  return 'secondary'
}