import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { data, getBadges } from '../services/dataService'
import StatCard from '../components/StatCard'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [mine, setMine] = useState([])
  const [rank, setRank] = useState('—')
  const [playingId, setPlayingId] = useState(null)

  useEffect(() => {
    data.getStats().then(setStats).catch(() => {})
    if (user) {
      data.getLeaderboard('all').then((lb) => {
        const found = lb.find((u) => u.id === user.id)
        if (found) setRank(found.rank)
      }).catch(() => {})

      data.getDatasets({ userId: user.id, limit: 10 }).then(setMine).catch(() => {})
    }
  }, [user])

  const total = user?.total_submissions || 0
  const accepted = user?.rejected ? Math.max(0, total - user.rejected) : total
  const accuracy = total > 0 ? Math.round((accepted / total) * 100) : 100
  const badges = getBadges(total)

  function playClip(d) {
    if (!d.audio_url) return
    if (playingId === d.id) {
      setPlayingId(null)
      return
    }
    const audio = new Audio(d.audio_url)
    setPlayingId(d.id)
    audio.play()
      .then(() => {
        audio.onended = () => setPlayingId(null)
      })
      .catch(() => setPlayingId(null))
  }

  return (
    <div className="container py-5">
      {/* Welcome Banner */}
      <div className="glass rounded-4 p-4 mb-4 brand-ring d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-3">
          {user?.photo ? (
            <img src={user.photo} alt="" className="avatar" style={{ width: 60, height: 60 }} />
          ) : (
            <span className="avatar" style={{ width: 60, height: 60, fontSize: '1.6rem' }}>
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h4 className="fw-bold mb-1">Ku soo dhawoow, {user?.username} 👋</h4>
            <div className="text-muted small">
              Waxaad ka mid tahay bulshada dhisaysa AI-da Af-Soomaaliga.
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-4 text-center">
          <div>
            <div className="micro-title">Accuracy Rate</div>
            <div className="fs-3 fw-bold text-lime">{accuracy}%</div>
          </div>
          <div className="vr opacity-25 d-none d-sm-block" style={{ height: 40 }} />
          <div>
            <div className="micro-title">Global Rank</div>
            <div className="fs-3 fw-bold text-lime">#{rank}</div>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard icon="bi-collection" label="Total Submissions" value={total.toLocaleString()} accent="lime" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon="bi-check2-circle" label="Accepted Clips" value={(user?.accepted || 0).toLocaleString()} accent="leaf" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon="bi-x-circle" label="Rejected Clips" value={(user?.rejected || 0).toLocaleString()} accent="gray" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon="bi-award" label="Badges Earned" value={`${badges.filter((b) => b.earned).length} / ${badges.length}`} accent="lily" />
        </div>
      </div>

      {/* Main Studio Shortcuts + Activity & Badges */}
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card p-4 h-100 brand-ring">
            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
              <div className="d-flex align-items-center gap-3">
                <div className="brand-ring d-grid place-items-center rounded-4 p-3" style={{ background: 'rgba(158,254,5,0.12)' }}>
                  <i className="bi bi-mic-fill fs-3 text-lime" />
                </div>
                <div>
                  <h5 className="fw-bold mb-0">Studio-ha Duubista Codka</h5>
                  <div className="text-muted small">Akhriso jumlado cusub, ku duub codkaaga oo gudbi.</div>
                </div>
              </div>
              <Link to="/record" className="btn btn-lime btn-lg px-4 py-2 rounded-pill fw-bold">
                <i className="bi bi-mic me-2" /> Bilow Duubista
              </Link>
            </div>

            <hr className="my-3 opacity-25" />

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="micro-title mb-0">Waxqabadkii Ugu Dambeeyay (Recent Recordings)</h6>
              <Link to="/verify" className="small text-lime text-decoration-none fw-semibold">
                Ansixi codadka bulshada <i className="bi bi-arrow-right" />
              </Link>
            </div>

            {mine.length === 0 ? (
              <div className="text-muted small text-center py-4 bg-soft rounded-3">
                <i className="bi bi-inbox fs-3 d-block text-lime mb-2" />
                Wali ma aad duubin cod. Riix 'Bilow Duubista' si aad u bilowdo!
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-lime table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Jumlada</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th className="text-end">Play</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mine.map((d) => (
                      <tr key={d.id}>
                        <td style={{ maxWidth: 300 }}>
                          <span className="d-inline-block text-truncate fw-semibold" style={{ maxWidth: 300 }}>
                            {d.sentence}
                          </span>
                        </td>
                        <td className="text-muted small">{d.duration ? `${d.duration}s` : '3.0s'}</td>
                        <td>
                          <span className={`badge text-bg-${statusBadge(d.status)} px-2 py-1`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="text-end">
                          {d.audio_url ? (
                            <button
                              className="btn btn-sm btn-outline-lime rounded-circle d-inline-grid place-items-center"
                              style={{ width: 32, height: 32 }}
                              onClick={() => playClip(d)}
                              title="Play recorded audio"
                            >
                              <i className={`bi ${playingId === d.id ? 'bi-pause-fill' : 'bi-play-fill'}`} />
                            </button>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Badges Column */}
        <div className="col-lg-4">
          <div className="card p-4 h-100 brand-ring">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-award text-lime fs-5" />
              Badges-kaada (Achievements)
            </h6>
            <div className="vstack gap-3">
              {badges.map((b) => (
                <div
                  key={b.name}
                  className={`badge-card d-flex align-items-center gap-3 p-3 rounded-3 bg-soft border ${
                    b.earned ? 'border-lime' : 'border-secondary border-opacity-25 badge-locked'
                  }`}
                >
                  <span className="badge-gem">{b.icon}</span>
                  <div className="flex-grow-1">
                    <div className="fw-bold small">{b.name} Badge</div>
                    <div className="text-muted small">{b.min.toLocaleString()} recordings required</div>
                  </div>
                  {b.earned ? (
                    <i className="bi bi-patch-check-fill text-lime fs-5" />
                  ) : (
                    <i className="bi bi-lock-fill text-muted" />
                  )}
                </div>
              ))}
            </div>

            <Link to="/profile" className="btn btn-outline-lime w-100 mt-4 rounded-pill fw-semibold">
              <i className="bi bi-person me-2" /> View Full Profile
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
  return 'warning'
}