import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { data } from '../services/dataService'
import { CONFIG } from '../config/config'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    data.getStats().then(setStats).catch(() => setStats(null))
  }, [])

  const collected = stats?.totalDatasets || 0
  const goal = CONFIG.goalCount
  const pct = Math.min(100, Math.round((collected / goal) * 100))

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="hero text-white">
        <div className="container py-5">
          <div className="row align-items-center g-5 py-5">
            <div className="col-lg-7">
              <span className="badge rounded-pill glass text-lime px-3 py-2 mb-3">
                <i className="bi bi-stars me-1" /> Mashruuca Codka Soomaaliga ee bulshada
              </span>
              <h1 className="display-4 fw-bold mb-3">
                Samee cod, <span className="text-gradient">horumarina AI-da Af-Soomaaliga</span>
              </h1>
              <p className="lead text-white-50 mb-4">
                {CONFIG.appSlogan}. Waxaad akhrisaa jumlad, waad duubtaa codkaaga, wadna caawisaa
                in la dhiso tayo cod oo xor ah oo Soomaalida adduunka oo dhan leedahay.
              </p>
              <div className="d-flex flex-wrap gap-3 mb-4">
                <Link to={user ? '/record' : '/register'} className="btn btn-lime btn-lg px-4">
                  <i className="bi bi-mic me-2" />
                  {user ? 'Bilow Duubista' : 'Ku Biir Hadda'}
                </Link>
                <Link to="/statistics" className="btn btn-outline-lime btn-lg px-4">
                  <i className="bi bi-graph-up me-2" />
                  Statistics
                </Link>
              </div>
              <div className="row g-3 text-center">
                <div className="col-4">
                  <div className="fs-3 fw-bold text-lime">{stats ? stats.contributors.toLocaleString() : '—'}</div>
                  <div className="small text-white-50">Contributors</div>
                </div>
                <div className="col-4">
                  <div className="fs-3 fw-bold text-lime">{stats ? stats.accepted.toLocaleString() : '—'}</div>
                  <div className="small text-white-50">Accepted Clips</div>
                </div>
                <div className="col-4">
                  <div className="fs-3 fw-bold text-lime">{stats ? stats.pending.toLocaleString() : '—'}</div>
                  <div className="small text-white-50">Pending Review</div>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="glass rounded-4 p-4 brand-ring">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="micro-title">1,000,000 Goal</span>
                  <span className="text-lime fw-bold">{pct}%</span>
                </div>
                <div className="progress mb-3" style={{ height: 14 }}>
                  <div
                    className="progress-bar"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg,#9efe05,#aaf228)',
                      borderRadius: 99,
                    }}
                  />
                </div>
                <div className="d-flex justify-content-between fs-5 fw-bold">
                  <span>
                    <i className="bi bi-collection text-lime me-2" />
                    {collected.toLocaleString()}
                  </span>
                  <span className="text-white-50 small fw-normal">Collected</span>
                </div>
                <div className="d-flex justify-content-between fs-5 fw-bold mt-2">
                  <span>
                    <i className="bi bi-hourglass-split text-lime me-2" />
                    {(goal - collected).toLocaleString()}
                  </span>
                  <span className="text-white-50 small fw-normal">Remaining</span>
                </div>
                <div className="d-flex justify-content-between fs-5 fw-bold mt-2">
                  <span>
                    <i className="bi bi-people text-lime me-2" />
                    {stats ? stats.contributors.toLocaleString() : '—'}
                  </span>
                  <span className="text-white-50 small fw-normal">Contributors</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <div className="micro-title">Sida ay u shaqeyso</div>
            <h2 className="fw-bold mt-1">Saddex talaabo oo fudud</h2>
            <div className="divider-lime mx-auto" />
          </div>
          <div className="row g-4">
            {[
              { icon: 'bi-megaphone', title: '1. Akhriso', text: 'Waxaad aragtaa jumlad Af-Soomaali ah oo qoran — akhriso si cad, in yar xawaare.' },
              { icon: 'bi-mic', title: '2. Duub', text: 'Riix badhanka duubista, ku duub codkaaga oo hubi inu caddaado.' },
              { icon: 'bi-check2-circle', title: '3. Gudbi', text: 'Gudbi duubista. Qof kastaa xaq u leeyahay inuu gudbiyo wanaaga dataset-ka.' },
            ].map((s) => (
              <div className="col-md-4" key={s.title}>
                <div className="card h-100 hover-lift text-center">
                  <div className="card-body p-4">
                    <div className="brand-ring mx-auto rounded-4 d-grid place-items-center mb-3" style={{ width: 64, height: 64, background: 'rgba(158,254,5,0.1)' }}>
                      <i className={`bi ${s.icon} fs-3 text-lime`} />
                    </div>
                    <h5 className="fw-bold">{s.title}</h5>
                    <p className="text-muted small mb-0">{s.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MISSION ============ */}
      <section className="py-5 bg-soft">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-5">
              <div className="micro-title">About CaawiyeAI</div>
              <h2 className="fw-bold mt-1 mb-3">Mission-keena</h2>
              <p className="text-muted">
                CaawiyeAI waa madal xor ah oo ku qoran <span className="text-lime fw-semibold">CC-BY-4.0</span>,
                oo lagu uruurinayo codka Af-Soomaaliga si loo tababaro Text-to-Speech, Speech-to-Text,
                Voice Assistants iyo LLM-yada Af-Soomaaliga.
              </p>
              <ul className="list-unstyled d-flex flex-column gap-2">
                {[
                  ['bi-shield-check', 'Xog free oo dadka iska leh'],
                  ['bi-translate', 'Lahjado: maay & maxaa-tiri'],
                  ['bi-graph-up-arrow', 'Dhinaca AI-da dadku talaashaan'],
                ].map(([icon, text]) => (
                  <li key={text} className="d-flex align-items-center gap-2">
                    <i className={`bi ${icon} text-lime fs-5`} />
                    {text}
                  </li>
                ))}
              </ul>
              <Link to="/statistics" className="btn btn-outline-lime mt-2">
                View Statistics <i className="bi bi-arrow-right ms-1" />
              </Link>
            </div>
            <div className="col-lg-7">
              <div className="row g-3">
                {[
                  { icon: 'bi-collection', label: 'Total Clips', key: 'totalDatasets' },
                  { icon: 'bi-check2-circle', label: 'Accepted', key: 'accepted' },
                  { icon: 'bi-x-circle', label: 'Rejected', key: 'rejected' },
                  { icon: 'bi-hourglass-split', label: 'Pending', key: 'pending' },
                ].map((s) => (
                  <div className="col-6 col-md-3" key={s.key}>
                    <div className="card text-center p-3 h-100 hover-lift">
                      <i className={`bi ${s.icon} text-lime fs-3`} />
                      <div className="fs-4 fw-bold mt-1">{stats ? stats[s.key].toLocaleString() : '—'}</div>
                      <div className="micro-title">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-5">
        <div className="container">
          <div className="glass rounded-4 p-5 text-center brand-ring">
            <h2 className="fw-bold mb-2">Dhiirrigeli codkaaga soomaaliga</h2>
            <p className="text-muted mb-4">Waxqabad yar oo 30-ilbiriqsi ah — saameyn weyn mustaqbalka AI-da Af-Soomaaliga.</p>
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <Link to={user ? '/record' : '/register'} className="btn btn-lime btn-lg px-5">
                <i className="bi bi-mic me-2" /> Bilow Duubista
              </Link>
              {user && (
                <Link to="/dashboard" className="btn btn-outline-lime btn-lg px-5">
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}