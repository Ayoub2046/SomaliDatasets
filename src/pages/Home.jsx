import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { data } from '../services/dataService'
import { CONFIG } from '../config/config'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'

export default function Home() {
  const { user } = useAuth()
  const { push } = useToast()
  const [stats, setStats] = useState(null)
  const [demoPlaying, setDemoPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    data.getStats().then(setStats).catch(() => setStats(null))
  }, [])

  const collected = stats?.totalDatasets || 0
  const goal = CONFIG.goalCount
  const pct = Math.min(100, Math.round((collected / goal) * 100))

  function playSampleAudio() {
    if (demoPlaying) {
      if (audioRef.current) audioRef.current.pause()
      setDemoPlaying(false)
      return
    }

    // Sample audio synthesized/recorded demo
    const sampleText = "Ku soo dhawoow CaawiyeAI, madasha codka Af-Soomaaliga ee bulshadu leedahay."
    push('Bilaabaya dhageysiga muunada codka...', 'info')
    
    // Using SpeechSynthesis API or audio sample
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(sampleText)
      u.rate = 0.9
      u.pitch = 1.0
      u.onend = () => setDemoPlaying(false)
      u.onerror = () => setDemoPlaying(false)
      setDemoPlaying(true)
      window.speechSynthesis.speak(u)
    } else {
      setDemoPlaying(false)
    }
  }

  function downloadSampleDataset() {
    const csvContent =
      "id,sentence,duration,gender,age_group,noise,status,created_at\n" +
      "1,\"Tignoolajiyada AI waxay beddeleysaa adduunka.\",4.2,male,18-29,1,approved,2026-08-01\n" +
      "2,\"Somalia waxay leedahay taariikh iyo dhaqan hodan ah.\",3.8,female,30-49,2,approved,2026-08-02\n" +
      "3,\"Waxay ku duubayaan codkooda si ay u dhisaan moodallada TTS.\",5.0,male,13-17,1,approved,2026-08-03\n"
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'caawiye_somali_voice_dataset_sample.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    push('Dataset metadata sample waa la soo downloaded! 📥')
  }

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="hero text-white position-relative">
        <div className="container py-5">
          <div className="row align-items-center g-5 py-4 py-lg-5">
            <div className="col-lg-7">
              <span className="badge rounded-pill glass text-lime px-3 py-2 mb-3 border-lime shadow-sm">
                <i className="bi bi-stars me-2" /> Mashruuca Codka Soomaaliga ee Bulshada 🇸🇴
              </span>
              <h1 className="display-3 fw-bold mb-3 lh-sm">
                Samee cod, <span className="text-gradient">horumarina AI-da Af-Soomaaliga</span>
              </h1>
              <p className="lead text-white-50 mb-4 lh-base">
                {CONFIG.appSlogan}. CaawiyeAI waa madal xor ah (Open-source CC-BY 4.0) oo lagu uruurinayo
                iyada oo bulshadu akhrineyso jumlado si loo tababaro TTS, Speech-to-Text & AI Voice Assistants.
              </p>

              <div className="d-flex flex-wrap gap-3 mb-5">
                <Link to={user ? '/record' : '/register'} className="btn btn-lime btn-lg px-4 py-3 rounded-pill pulse-glow fw-bold">
                  <i className="bi bi-mic-fill me-2 fs-5" />
                  {user ? 'Bilow Duubista Hadda' : 'Ku Biir Hadda (Free)'}
                </Link>
                <Link to="/verify" className="btn btn-outline-lime btn-lg px-4 py-3 rounded-pill fw-bold">
                  <i className="bi bi-check2-all me-2" />
                  Dhageyso & Ansixi
                </Link>
              </div>

              {/* Counter Cards */}
              <div className="row g-3 text-center">
                <div className="col-4">
                  <div className="glass rounded-4 p-3 hover-lift">
                    <div className="fs-3 fw-bold text-lime">{stats ? stats.contributors.toLocaleString() : '1,240'}</div>
                    <div className="micro-title">Contributors</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="glass rounded-4 p-3 hover-lift">
                    <div className="fs-3 fw-bold text-lime">{stats ? stats.accepted.toLocaleString() : '8,420'}</div>
                    <div className="micro-title">Accepted Clips</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="glass rounded-4 p-3 hover-lift">
                    <div className="fs-3 fw-bold text-lime">{stats ? stats.pending.toLocaleString() : '1,150'}</div>
                    <div className="micro-title">Pending Review</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Goal Progress Ring & Live Demo Card */}
            <div className="col-lg-5">
              <div className="glass rounded-4 p-4 brand-ring floating-element">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="micro-title text-lime fw-bold">1,000,000 Clips Goal</span>
                  <span className="text-lime fw-bold">{pct}%</span>
                </div>
                <div className="progress mb-4" style={{ height: 16, background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg,#9efe05,#aaf228)',
                      borderRadius: 99,
                    }}
                  />
                </div>

                <div className="d-flex justify-content-between fs-5 fw-bold mb-2">
                  <span>
                    <i className="bi bi-collection text-lime me-2" />
                    {collected.toLocaleString()}
                  </span>
                  <span className="text-white-50 small fw-normal">La Uruuriyay</span>
                </div>
                <div className="d-flex justify-content-between fs-5 fw-bold mb-2">
                  <span>
                    <i className="bi bi-hourglass-split text-lime me-2" />
                    {(goal - collected).toLocaleString()}
                  </span>
                  <span className="text-white-50 small fw-normal">Harsan</span>
                </div>
                <div className="d-flex justify-content-between fs-5 fw-bold">
                  <span>
                    <i className="bi bi-people text-lime me-2" />
                    {stats ? stats.contributors.toLocaleString() : '1,240'}
                  </span>
                  <span className="text-white-50 small fw-normal">Bulshada</span>
                </div>

                <hr className="my-4 border-secondary opacity-25" />

                {/* Sample Audio Widget */}
                <div className="p-3 rounded-3 bg-soft border border-secondary border-opacity-25">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-semibold small">Muunad Cod ah (Live Sample)</div>
                      <div className="text-muted micro-title">Tusaale Somali AI Voice</div>
                    </div>
                    <button
                      className="btn btn-sm btn-lime rounded-circle d-grid place-items-center"
                      style={{ width: 42, height: 42 }}
                      onClick={playSampleAudio}
                      title="Dhageyso Muunad"
                    >
                      <i className={`bi ${demoPlaying ? 'bi-pause-fill' : 'bi-play-fill'} fs-5`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-5">
        <div className="container py-4">
          <div className="text-center mb-5">
            <div className="micro-title text-lime">Habka Shaqada</div>
            <h2 className="fw-bold display-6 mt-1">Saddex talleabo oo fudud</h2>
            <div className="divider-lime mx-auto mt-2" />
          </div>
          <div className="row g-4">
            {[
              {
                icon: 'bi-megaphone',
                step: '01',
                title: '1. Akhriso Jumlada',
                text: 'Arag jumlad Af-Soomaali ah oo qoran — ka akhri makarafoonkaaga si cad iyo xawaare caadi ah.',
              },
              {
                icon: 'bi-mic',
                step: '02',
                title: '2. Duub & Dhageyso',
                text: 'Riix badhanka duubista, ka dibna dhageyso codkaaga ka hor inta aadan soo gudbin.',
              },
              {
                icon: 'bi-check2-circle',
                step: '03',
                title: '3. Gudbi & Ansixi',
                text: 'Codkaagu wuxuu si toos ah uga qayb qaadanayaa dhisidda dataset-ka xorta ah ee Af-Soomaaliga.',
              },
            ].map((s) => (
              <div className="col-md-4" key={s.title}>
                <div className="card h-100 hover-lift text-center p-4 position-relative border-0 bg-panel">
                  <span className="position-absolute top-0 end-0 p-3 micro-title text-lime opacity-50 fw-bold fs-5">
                    {s.step}
                  </span>
                  <div className="card-body">
                    <div
                      className="brand-ring mx-auto rounded-4 d-grid place-items-center mb-4"
                      style={{ width: 68, height: 68, background: 'rgba(158,254,5,0.12)' }}
                    >
                      <i className={`bi ${s.icon} fs-2 text-lime`} />
                    </div>
                    <h4 className="fw-bold mb-2">{s.title}</h4>
                    <p className="text-muted small lh-base mb-0">{s.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MISSION & EXPORT ============ */}
      <section className="py-5 bg-soft border-top border-bottom border-secondary border-opacity-10">
        <div className="container py-4">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <div className="micro-title text-lime">Maxay Tahay CaawiyeAI?</div>
              <h2 className="fw-bold display-6 mt-1 mb-3">Mashruuca Codka Furan ee Soomaalida</h2>
              <p className="text-muted lead fs-6 mb-4">
                CaawiyeAI waxay si buuxda u taageertaa beddelidda codka Af-Soomaaliga oo loo beddelo AI. Waxay u oggolaanaysaa horumarinta, cilmi-baarayaasha iyo bulshada inay helaan
                dataset tayo leh oo shaqaynaya.
              </p>
              <div className="row g-3 mb-4">
                {[
                  ['bi-shield-check', 'Open Source (CC-BY 4.0) License'],
                  ['bi-translate', 'Lahjadaha: Maxaa-tiri, Maay, Banaadiri'],
                  ['bi-file-earmark-zip', '48kHz WAV / Mono Clean Quality'],
                  ['bi-cpu', 'Habboon STT, TTS & Voice AI Models'],
                ].map(([icon, text]) => (
                  <div className="col-md-6" key={text}>
                    <div className="d-flex align-items-center gap-2">
                      <i className={`bi ${icon} text-lime fs-5`} />
                      <span className="small fw-semibold">{text}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="d-flex flex-wrap gap-3">
                <Link to="/statistics" className="btn btn-lime">
                  View Full Analytics <i className="bi bi-arrow-right ms-1" />
                </Link>
                <button className="btn btn-outline-lime" onClick={downloadSampleDataset}>
                  <i className="bi bi-download me-2" /> Download Sample CSV
                </button>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="row g-3">
                {[
                  { icon: 'bi-collection', label: 'Total Clips', key: 'totalDatasets', fallback: '9,570' },
                  { icon: 'bi-check2-circle', label: 'Accepted', key: 'accepted', fallback: '8,420' },
                  { icon: 'bi-x-circle', label: 'Rejected', key: 'rejected', fallback: '340' },
                  { icon: 'bi-hourglass-split', label: 'Pending', key: 'pending', fallback: '1,150' },
                ].map((s) => (
                  <div className="col-6" key={s.key}>
                    <div className="card text-center p-4 h-100 hover-lift brand-ring">
                      <i className={`bi ${s.icon} text-lime display-6 mb-2`} />
                      <div className="fs-3 fw-bold mt-1">
                        {stats ? stats[s.key].toLocaleString() : s.fallback}
                      </div>
                      <div className="micro-title mt-1">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CALL TO ACTION ============ */}
      <section className="py-5">
        <div className="container py-4">
          <div className="glass rounded-4 p-5 text-center brand-ring position-relative overflow-hidden">
            <div className="position-relative z-1">
              <h2 className="fw-bold display-6 mb-3">Dhiirrigeli codkaaga Soomaaliga</h2>
              <p className="text-muted lead fs-6 mb-4 max-w-600 mx-auto">
                Waxqabad yar oo 1-daqiqad ah wuxuu leeyahay saameyn ballaaran oo ka muuqanaysa AI-da Af-Soomaaliga.
              </p>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <Link to={user ? '/record' : '/register'} className="btn btn-lime btn-lg px-5 py-3 rounded-pill fw-bold">
                  <i className="bi bi-mic-fill me-2" /> Bilow Duubista Codka
                </Link>
                <Link to="/verify" className="btn btn-outline-lime btn-lg px-5 py-3 rounded-pill fw-bold">
                  <i className="bi bi-check2-square me-2" /> Ansixi Codadka
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}