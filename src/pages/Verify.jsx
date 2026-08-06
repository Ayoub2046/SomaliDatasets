import { useEffect, useState, useRef } from 'react'
import { data } from '../services/dataService'
import { useToast } from '../components/ui/Toast'
import PageHeader from '../components/PageHeader'

export default function Verify() {
  const { push } = useToast()
  const [datasets, setDatasets] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [stats, setStats] = useState({ validated: 0, clear: 0 })
  const audioRef = useRef(null)

  useEffect(() => {
    loadPendingDatasets()
  }, [])

  async function loadPendingDatasets() {
    setLoading(true)
    try {
      const rows = await data.getDatasets({ limit: 100 })
      setDatasets(rows || [])
      setCurrentIndex(0)
    } catch {
      push('Kala soo bixida dataset-yada waa ku guuldareysatay.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const current = datasets[currentIndex]

  function playAudio() {
    if (!current?.audio_url && !current?.storage_key) {
      push('Codkaan ma laha fayl playable ah.', 'warning')
      return
    }
    const src = current.audio_url || current.storage_key
    if (!audioRef.current) {
      audioRef.current = new Audio(src)
    } else {
      audioRef.current.src = src
    }

    setPlaying(true)
    audioRef.current.play().then(() => {
      audioRef.current.onended = () => setPlaying(false)
    }).catch(() => {
      setPlaying(false)
      push('Ma dhagaysan kartid faylkan.', 'error')
    })
  }

  async function handleVote(isClear) {
    if (!current) return
    try {
      if (isClear) {
        setStats((s) => ({ ...s, validated: s.validated + 1, clear: s.clear + 1 }))
        push('Waad ku mahadsantahay! Codka waa loo calaamadeeyay inuu cad yahay. ✓')
      } else {
        setStats((s) => ({ ...s, validated: s.validated + 1 }))
        push('Calaamadeynta waa la keydiyay. ✗', 'info')
      }
      nextClip()
    } catch (_) {
      push('Cillad ayaa dhacday.', 'error')
    }
  }

  function nextClip() {
    if (audioRef.current) {
      audioRef.current.pause()
      setPlaying(false)
    }
    if (currentIndex < datasets.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      push('Dhammaan clips-ka diyaar ah waa la dhageystay! 🎉')
      loadPendingDatasets()
    }
  }

  return (
    <div className="container py-5">
      <PageHeader
        icon="bi-check2-all"
        title="Dhageyso & Ansixi (Verify Audio)"
        subtitle="Caawi in la xaqiijiyo tayada codadka bulshadu gudbisay"
        action={
          <div className="glass px-3 py-2 rounded-pill text-lime small fw-bold">
            <i className="bi bi-patch-check me-1" />
            La Xaqiijiyay Hadda: {stats.validated}
          </div>
        }
      />

      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card p-4 p-md-5 brand-ring">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-lime mb-2" />
                <div className="text-muted small">Soo raraya codadka...</div>
              </div>
            ) : current ? (
              <>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="badge text-bg-dark border border-lime text-lime px-3 py-2">
                    Clip #{currentIndex + 1} / {datasets.length}
                  </span>
                  <span className="small text-muted">
                    Contributor: <span className="fw-semibold text-white">{current.username || 'Bulshada'}</span>
                  </span>
                </div>

                {/* Target sentence display */}
                <div className="glass rounded-4 p-4 text-center mb-4">
                  <div className="micro-title text-lime mb-2">Qoraalka Jumlada</div>
                  <h4 className="fw-bold lh-base text-white mb-0">
                    "{current.sentence}"
                  </h4>
                </div>

                {/* Metadata tags */}
                <div className="d-flex justify-content-center flex-wrap gap-2 mb-4">
                  <span className="badge bg-soft text-muted px-3 py-2">
                    <i className="bi bi-clock me-1 text-lime" />
                    {current.duration ? `${current.duration}s` : '3.5s'}
                  </span>
                  <span className="badge bg-soft text-muted px-3 py-2">
                    <i className="bi bi-gender-ambiguous me-1 text-lime" />
                    {current.gender || 'General'}
                  </span>
                  <span className="badge bg-soft text-muted px-3 py-2">
                    <i className="bi bi-person-badge me-1 text-lime" />
                    {current.age_group || '18-29'}
                  </span>
                </div>

                {/* Audio Player Button */}
                <div className="text-center mb-5">
                  <button
                    className={`btn btn-lime btn-lg px-5 py-3 rounded-pill fw-bold ${
                      playing ? 'rec-pulse' : 'pulse-glow'
                    }`}
                    onClick={playAudio}
                  >
                    <i className={`bi ${playing ? 'bi-volume-up-fill' : 'bi-play-fill'} me-2 fs-4`} />
                    {playing ? 'Dhageysanayaa...' : 'Dhageyso Codka Hadda'}
                  </button>
                </div>

                {/* Verification Questions */}
                <div className="text-center border-top pt-4">
                  <h5 className="fw-bold mb-3">Ma caddahay codkaan mise qoraalka ayuu u dhigmaa?</h5>
                  <div className="d-flex justify-content-center gap-3 flex-wrap">
                    <button
                      className="btn btn-success btn-lg px-4 rounded-pill fw-bold"
                      onClick={() => handleVote(true)}
                    >
                      <i className="bi bi-hand-thumbs-up-fill me-2" />
                      Waa Cad yahay (Yes)
                    </button>
                    <button
                      className="btn btn-danger btn-lg px-4 rounded-pill fw-bold"
                      onClick={() => handleVote(false)}
                    >
                      <i className="bi bi-hand-thumbs-down-fill me-2" />
                      Ma Cadda (No)
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-lg px-4 rounded-pill"
                      onClick={nextClip}
                    >
                      <i className="bi bi-skip-forward-fill me-2" />
                      Bood (Skip)
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-5">
                <i className="bi bi-check-circle-fill text-lime display-1 mb-3" />
                <h4>Hambalyo! Dhammaan codadka waa la xaqiijiyay!</h4>
                <p className="text-muted">Waad ku mahadsantahay caawimaadaada horumarinta AI-da Af-Soomaaliga.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
