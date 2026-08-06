import { useEffect, useRef, useState } from 'react'
import { data } from '../services/dataService'
import { useToast } from '../components/ui/Toast'
import { seedSentences } from '../services/mockData'

const idle = 'idle'
const recording = 'recording'
const playing = 'playing'
const recorded = 'recorded'

const PREF_KEY = 'caawiyeai_user_demographics_v1'

const CATEGORIES = [
  { id: 'all', label: 'Dhammaan (All)' },
  { id: 'general', label: 'Caadiga ah (General)' },
  { id: 'technology', label: 'Tiknoolajiyada (Tech)' },
  { id: 'health', label: 'Caafimaadka (Health)' },
  { id: 'culture', label: 'Dhaqanka & Quraanka' },
]

export default function Record() {
  const { push } = useToast()

  // Sentence Mode: 'custom' (user types sentence) vs 'preset' (chooses existing)
  const [mode, setMode] = useState('custom')
  const [customText, setCustomText] = useState('')

  const [sentences, setSentences] = useState([])
  const [filteredSentences, setFilteredSentences] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [current, setCurrent] = useState(null)
  const [state, setState] = useState(idle)
  const [audioUrl, setAudioUrl] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [micError, setMicError] = useState('')
  const [rememberMeta, setRememberMeta] = useState(true)

  // Demographics state
  const [meta, setMeta] = useState({
    gender: '',
    age: '',
    noise: 3,
    dialect: 'maxaa-tiri',
    device: '',
    browser: '',
  })

  const recRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const startedAtRef = useRef(0)
  const blobRef = useRef(null)
  const canvasRef = useRef(null)
  const audioCtxRef = useRef(null)
  const animFrameRef = useRef(null)

  // Load saved preferences & sentences
  useEffect(() => {
    const browser = detectBrowser()
    const device = navigator.userAgent.includes('Mobi') ? 'Mobile' : 'Desktop'

    // Load stored demographics
    try {
      const saved = localStorage.getItem(PREF_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setMeta((m) => ({ ...m, ...parsed, browser, device }))
      } else {
        setMeta((m) => ({ ...m, browser, device }))
      }
    } catch (_) {
      setMeta((m) => ({ ...m, browser, device }))
    }

    async function load() {
      let rows
      try {
        rows = await data.getSentences()
      } catch {
        rows = []
      }
      const list = rows && rows.length ? rows : seedSentences
      setSentences(list)
      setFilteredSentences(list)
      if (list.length > 0) {
        setCurrent(list[0])
        setCurrentIndex(0)
      }
    }
    load()

    return () => {
      releaseStream()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // Filter sentences when category changes
  useEffect(() => {
    let list = sentences
    if (selectedCategory !== 'all') {
      list = sentences.filter((s) => (s.category || 'general').toLowerCase() === selectedCategory)
      if (list.length === 0) list = sentences
    }
    setFilteredSentences(list)
    setCurrentIndex(0)
    if (mode === 'preset') {
      setCurrent(list[0] || null)
    }
  }, [selectedCategory, sentences, mode])

  // Active sentence text getter
  const activeSentenceText = mode === 'custom' ? customText.trim() : current?.text || ''

  // Save demographics if checked
  const updateMeta = (key, value) => {
    const updated = { ...meta, [key]: value }
    setMeta(updated)
    if (rememberMeta) {
      try {
        localStorage.setItem(
          PREF_KEY,
          JSON.stringify({
            gender: updated.gender,
            age: updated.age,
            dialect: updated.dialect,
            noise: updated.noise,
          })
        )
      } catch (_) {}
    }
  }

  function releaseStream() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
  }

  function nextSentence() {
    releaseStream()
    setState(idle)
    setAudioUrl(null)
    blobRef.current = null
    setElapsed(0)
    setMicError('')
    if (mode === 'custom') {
      setCustomText('')
    } else if (filteredSentences.length > 0) {
      const nextIdx = (currentIndex + 1) % filteredSentences.length
      setCurrentIndex(nextIdx)
      setCurrent(filteredSentences[nextIdx])
    }
  }

  function prevSentence() {
    releaseStream()
    setState(idle)
    setAudioUrl(null)
    blobRef.current = null
    setElapsed(0)
    setMicError('')
    if (mode === 'preset' && filteredSentences.length > 0) {
      const prevIdx = (currentIndex - 1 + filteredSentences.length) % filteredSentences.length
      setCurrentIndex(prevIdx)
      setCurrent(filteredSentences[prevIdx])
    }
  }

  function randomSentence() {
    releaseStream()
    setState(idle)
    setAudioUrl(null)
    blobRef.current = null
    setElapsed(0)
    setMicError('')
    if (filteredSentences.length > 1) {
      let rand = Math.floor(Math.random() * filteredSentences.length)
      if (rand === currentIndex) rand = (rand + 1) % filteredSentences.length
      setCurrentIndex(rand)
      setCurrent(filteredSentences[rand])
    }
  }

  // Visualizer loop using Canvas & Web Audio API
  function drawLiveVisualizer(stream) {
    if (!canvasRef.current) return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)

      const canvas = canvasRef.current
      const canvasCtx = canvas.getContext('2d')
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const render = () => {
        if (!canvasCtx || state === idle) return
        animFrameRef.current = requestAnimationFrame(render)
        analyser.getByteFrequencyData(dataArray)

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height)
        const barWidth = (canvas.width / bufferLength) * 1.4
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.9
          const grad = canvasCtx.createLinearGradient(0, canvas.height, 0, 0)
          grad.addColorStop(0, '#9efe05')
          grad.addColorStop(1, '#aaf228')

          canvasCtx.fillStyle = grad
          if (canvasCtx.roundRect) {
            canvasCtx.beginPath()
            canvasCtx.roundRect(x, canvas.height - barHeight, Math.max(1, barWidth - 3), barHeight, 4)
            canvasCtx.fill()
          } else {
            canvasCtx.fillRect(x, canvas.height - barHeight, Math.max(1, barWidth - 3), barHeight)
          }

          x += barWidth
        }
      }
      render()
    } catch (_) {
      /* Fallback if unsupported */
    }
  }

  async function startRecording() {
    if (state === recording) return
    if (mode === 'custom' && !customText.trim()) {
      push('Fadlan marka hore qor jumlada aad rabto inaad duubto.', 'warning')
      return
    }

    setMicError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const rec = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        blobRef.current = blob
        setAudioUrl(URL.createObjectURL(blob))
        setState(recorded)
      }

      recRef.current = rec
      startedAtRef.current = Date.now()
      rec.start()
      setState(recording)
      setElapsed(0)

      drawLiveVisualizer(stream)

      timerRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)),
        200
      )
    } catch {
      setMicError('Aan heli karin makarafoonka. Fadlan sii fasax/permissions makarafoonkaaga browser-ka.')
      setState(idle)
    }
  }

  function stopRecording() {
    if (state !== recording) return
    if (elapsed < 1) {
      push('Duubistu waa inay ka weynaataa 1 ilbiriqsi.', 'warning')
    }
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
  }

  function playBack() {
    const el = document.getElementById('player')
    if (!el || !audioUrl) return
    el.currentTime = 0
    setState(playing)
    el.play()
      .then(() => {
        el.onended = () => setState(recorded)
      })
      .catch(() => setState(recorded))
  }

  async function submit() {
    if (!audioUrl) return
    if (!activeSentenceText) {
      push('Jumlada ma qorna. Fadlan qor jumlada.', 'error')
      return
    }
    if (!meta.gender || !meta.age) {
      push("Fadlan dooro jinsiga iyo kooxda da'da ka hor inta aadan gudbin.", 'error')
      return
    }
    setBusy(true)
    try {
      const audioBytes = blobRef.current
      if (!audioBytes) throw new Error('Codbixintu ma jirto. Fadlan mar kale duub.')

      await data.submitDataset({
        sentence: activeSentenceText,
        sentence_id: mode === 'preset' ? current?.id : null,
        audio_blob: audioBytes,
        duration: Math.max(1, elapsed),
        metadata: {
          noise: meta.noise,
          gender: meta.gender,
          age_group: meta.age,
          dialect: meta.dialect,
          device: meta.device,
          browser: meta.browser,
        },
      })
      push('Dataset-ka waa la gudbiyay! Waad ku mahadsantahay caawintaada. 🎉')
      nextSentence()
    } catch (err) {
      push('Gudbinta ku timaadday maamul: ' + (err.message || 'error'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-9">
          {/* Main Card */}
          <div className="card p-4 p-md-5 brand-ring">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4 border-bottom pb-3">
              <div>
                <h3 className="fw-bold mb-1">
                  <i className="bi bi-mic-fill text-lime me-2" />
                  Studio-ha Duubista Codka
                </h3>
                <div className="text-muted small">
                  Qor jumladaada ama dooro mid diyaar ah, markaas duub codkaaga.
                </div>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="btn-group p-1 glass rounded-pill">
                <button
                  className={`btn btn-sm rounded-pill fw-bold px-3 ${
                    mode === 'custom' ? 'btn-lime' : 'text-white border-0'
                  }`}
                  onClick={() => {
                    setMode('custom')
                    setState(idle)
                  }}
                >
                  <i className="bi bi-pencil-square me-1" /> Qor Jumladaada
                </button>
                <button
                  className={`btn btn-sm rounded-pill fw-bold px-3 ${
                    mode === 'preset' ? 'btn-lime' : 'text-white border-0'
                  }`}
                  onClick={() => {
                    setMode('preset')
                    setState(idle)
                  }}
                >
                  <i className="bi bi-collection me-1" /> Jumlado Diyaar ah
                </button>
              </div>
            </div>

            {/* Custom Mode Input Box */}
            {mode === 'custom' && (
              <div className="glass rounded-4 p-4 mb-4 hover-glow">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="fw-bold text-lime micro-title d-flex align-items-center gap-1">
                    <i className="bi bi-keyboard fs-6" /> Qor Jumlada Aad Rabto Inaad Duubto:
                  </label>
                  <span className="small text-white-50">
                    {customText.length} characters
                  </span>
                </div>
                <textarea
                  className="form-control bg-dark text-white border-lime fs-5 fw-semibold p-3 rounded-3"
                  rows={3}
                  placeholder="Halkan ku qor jumlada aad rabto inaad ku duubto codkaaga..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  disabled={state === recording}
                />
                <div className="small text-muted mt-2 d-flex align-items-center gap-1">
                  <i className="bi bi-info-circle text-lime" />
                  Qor jumlad cad oo naxwo ahaan sax ah ka hor inta aadan riixin badhanka duubista.
                </div>
              </div>
            )}

            {/* Preset Mode Selection Box */}
            {mode === 'preset' && (
              <>
                {/* Category Filter */}
                <div className="d-flex align-items-center gap-2 overflow-x-auto pb-2 mb-3">
                  <span className="small text-muted fw-semibold me-1">Qaybta:</span>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      className={`btn btn-sm rounded-pill text-nowrap ${
                        selectedCategory === cat.id ? 'btn-lime' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="glass rounded-4 p-4 text-center position-relative mb-4 hover-glow" style={{ minHeight: 140 }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <button
                      className="btn btn-sm btn-outline-secondary rounded-circle"
                      onClick={prevSentence}
                      title="Previous sentence"
                    >
                      <i className="bi bi-chevron-left" />
                    </button>
                    <span className="micro-title text-lime">Akhriso Jumladdan</span>
                    <button
                      className="btn btn-sm btn-outline-secondary rounded-circle"
                      onClick={nextSentence}
                      title="Next sentence"
                    >
                      <i className="bi bi-chevron-right" />
                    </button>
                  </div>
                  <p className="fs-4 fw-bold lh-base text-gradient mb-2 px-3">
                    "{current?.text || 'Sentences loading...'}"
                  </p>
                  <div className="d-flex justify-content-between align-items-center small text-white-50 px-2 mt-2">
                    <span>
                      Category: <span className="text-lime fw-semibold">{current?.category || 'General'}</span>
                    </span>
                    <button
                      className="btn btn-sm btn-outline-lime rounded-pill"
                      onClick={randomSentence}
                    >
                      <i className="bi bi-shuffle me-1" /> Badal Jumlad
                    </button>
                  </div>
                </div>
              </>
            )}

            {micError && (
              <div className="alert alert-warning py-2 small d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-exclamation-triangle-fill fs-5" />
                <div>{micError}</div>
              </div>
            )}

            {/* Live Audio Visualizer / Wave */}
            <div className="text-center mb-3">
              <div className={`fs-1 fw-bold ${state === recording ? 'text-danger rec-pulse' : 'text-lime'}`}>
                {fmt(elapsed)}
              </div>
            </div>

            <div className="position-relative mb-4 text-center">
              {state === recording ? (
                <canvas
                  ref={canvasRef}
                  className="visualizer-canvas"
                  height={80}
                  width={600}
                />
              ) : (
                <div className="wavebox">
                  {state === recorded || state === playing
                    ? Array.from({ length: 24 }).map((_, i) => (
                        <span
                          key={i}
                          style={{
                            height: Math.min(65, Math.max(16, (i * 17) % 55)),
                            opacity: state === playing ? 1 : 0.65,
                            background: '#9efe05',
                            animation: state === playing ? 'wave 0.8s ease-in-out infinite' : 'none',
                          }}
                        />
                      ))
                    : Array.from({ length: 24 }).map((_, i) => (
                        <span key={i} style={{ height: 12, opacity: 0.2, animation: 'none' }} />
                      ))}
                </div>
              )}
            </div>

            {/* Recording Control Buttons */}
            <div className="d-flex justify-content-center gap-3 flex-wrap mb-4">
              {state === idle && (
                <button
                  className="btn btn-lime btn-lg px-5 py-3 rounded-pill pulse-glow fw-bold"
                  onClick={startRecording}
                >
                  <i className="bi bi-mic-fill me-2 fs-5" /> Bilow Duubista
                </button>
              )}

              {state === recording && (
                <button
                  className="btn btn-danger btn-lg px-5 py-3 rounded-pill rec-pulse fw-bold"
                  onClick={stopRecording}
                >
                  <i className="bi bi-stop-fill me-2 fs-5" /> Jooji Duubista
                </button>
              )}

              {(state === recorded || state === playing) && (
                <>
                  <button
                    className="btn btn-outline-lime btn-lg px-4 rounded-pill"
                    onClick={playBack}
                    disabled={state === playing}
                  >
                    <i className={`bi ${state === playing ? 'bi-pause-fill' : 'bi-play-fill'} me-2`} />
                    {state === playing ? 'Dhageysanayaa...' : 'Dhageyso Codka'}
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-lg px-4 rounded-pill"
                    onClick={startRecording}
                  >
                    <i className="bi bi-arrow-repeat me-2" /> Mar kale Duub
                  </button>
                  <button
                    className="btn btn-outline-danger btn-lg px-3 rounded-pill"
                    onClick={nextSentence}
                    title="Jumlad cusub"
                  >
                    <i className="bi bi-plus-circle me-1" /> New Sentence
                  </button>
                </>
              )}
            </div>

            <audio id="player" src={audioUrl || undefined} className="d-none" />

            {/* Demographics & Submission Form */}
            {state === recorded && (
              <div className="glass rounded-4 p-4 mt-3 border-top">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0">
                    <i className="bi bi-card-checklist text-lime me-2" />
                    Macluumaadka Codka (Demographics)
                  </h5>
                  <div className="form-check form-switch small">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="remCheck"
                      checked={rememberMeta}
                      onChange={(e) => setRememberMeta(e.target.checked)}
                    />
                    <label className="form-check-label text-muted" htmlFor="remCheck">
                      Xasuuso dookhyadayda
                    </label>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">
                      Jinsiga <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select bg-soft"
                      value={meta.gender}
                      onChange={(e) => updateMeta('gender', e.target.value)}
                    >
                      <option value="">Dooro jinsi...</option>
                      <option value="male">Rag (Male)</option>
                      <option value="female">Dumar (Female)</option>
                      <option value="other">Kala kale (Other)</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">
                      Kooxda Da'da <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select bg-soft"
                      value={meta.age}
                      onChange={(e) => updateMeta('age', e.target.value)}
                    >
                      <option value="">Dooro da'da...</option>
                      <option value="13-17">13 - 17 sanno</option>
                      <option value="18-29">18 - 29 sanno</option>
                      <option value="30-49">30 - 49 sanno</option>
                      <option value="50-64">50 - 64 sanno</option>
                      <option value="65+">65+ sanno</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Lahjada (Dialect)</label>
                    <select
                      className="form-select bg-soft"
                      value={meta.dialect}
                      onChange={(e) => updateMeta('dialect', e.target.value)}
                    >
                      <option value="maxaa-tiri">Maxaa-tiri</option>
                      <option value="maay">Maay</option>
                      <option value="banadiri">Banaadiri</option>
                      <option value="waqooyi">Waqooyi</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold d-flex justify-content-between">
                      <span>Darajada Qaylada Qolka (Noise level)</span>
                      <span className="text-lime fw-bold">{meta.noise} / 5</span>
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="1"
                      max="5"
                      value={meta.noise}
                      onChange={(e) => updateMeta('noise', +e.target.value)}
                    />
                    <div className="d-flex justify-content-between micro-title">
                      <span>Aamusnaan Buuxda (Quiet)</span>
                      <span>Qaylo Dheeraad ah (Noisy)</span>
                    </div>
                  </div>

                  <div className="col-12 d-flex justify-content-end mt-4">
                    <button
                      className="btn btn-lime btn-lg px-5 rounded-pill fw-bold"
                      onClick={submit}
                      disabled={busy}
                    >
                      {busy ? (
                        <span className="spinner-border spinner-border-sm me-2" />
                      ) : (
                        <i className="bi bi-cloud-arrow-up-fill me-2" />
                      )}
                      Gudbi Dataset-ka
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function detectBrowser() {
  const ua = navigator.userAgent
  if (/edg/i.test(ua)) return 'Edge'
  if (/chrome|crios/i.test(ua)) return 'Chrome'
  if (/firefox/i.test(ua)) return 'Firefox'
  if (/safari|fxios/i.test(ua)) return 'Safari'
  return 'Browser'
}