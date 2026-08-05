import { useEffect, useRef, useState } from 'react'
import { data } from '../services/dataService'
import { useToast } from '../components/ui/Toast'
import { seedSentences } from '../services/mockData'

const idle = 'idle'
const recording = 'recording'
const playing = 'playing'
const recorded = 'recorded'

export default function Record() {
  const { push } = useToast()
  const [sentences, setSentences] = useState([])
  const [current, setCurrent] = useState(null)
  const [state, setState] = useState(idle)
  const [audioUrl, setAudioUrl] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [meta, setMeta] = useState({ gender: '', age: '', noise: 3, device: '', browser: '' })
  const [micError, setMicError] = useState('')

  const recRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const startedAtRef = useRef(0)
  const idxRef = useRef(0)

  useEffect(() => {
    const browser = detectBrowser()
    const device = navigator.userAgent.includes('Mobi') ? 'Mobile' : 'Desktop'
    setMeta((m) => ({ ...m, browser, device }))
    async function load() {
      let rows
      try {
        rows = await data.getSentences()
      } catch {
        rows = []
      }
      const list = rows && rows.length ? rows : seedSentences
      setSentences(list)
      setCurrent(list[0])
    }
    load()
    return () => releaseStream()
  }, [])

  function releaseStream() {
    timerRef.current && clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current && streamRef.current.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  function next() {
    releaseStream()
    setState(idle)
    setAudioUrl(null)
    setElapsed(0)
    setMicError('')
    setMeta((m) => ({ ...m, gender: '', age: '', noise: 3 }))
    const n = (idxRef.current + 1) % sentences.length
    idxRef.current = n
    setCurrent(sentences[n])
  }

  async function startRecording() {
    if (state === recording) return
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
        setAudioUrl(URL.createObjectURL(blob))
        setState(recorded)
      }
      recRef.current = rec
      startedAtRef.current = Date.now()
      rec.start()
      setState(recording)
      setElapsed(0)
      timerRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)),
        250,
      )
    } catch {
      setMicError('Aan heli karin mic-ka. Fadlan u oggolow aqoonsiga mic-ka. ')
      setState(idle)
    }
  }

  function stopRecording() {
    if (state !== recording) return
    timerRef.current && clearInterval(timerRef.current)
    timerRef.current = null
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    streamRef.current && streamRef.current.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  function playBack() {
    const el = document.getElementById('player')
    if (!el || !audioUrl) return
    el.currentTime = 0
    setState(playing)
    el.play().then(() => {
      el.onended = () => setState(recorded)
    })
  }

  async function submit() {
    if (!audioUrl) return
    if (!meta.gender || !meta.age) {
      push('Fadlan buuxi jinsiga iyo kooxda da\'da.', 'error')
      return
    }
    setBusy(true)
    try {
      const audioBytes = await fetch(audioUrl).then((r) => r.blob())
      await data.submitDataset({
        sentence: current?.text,
        sentence_id: current?.id,
        audio_blob: audioBytes,
        duration: Math.max(1, elapsed),
        metadata: {
          noise: meta.noise,
          gender: meta.gender,
          age_group: meta.age,
          device: meta.device,
          browser: meta.browser,
        },
      })
      push('Dataset ayaa la gudbiyay! Aad baad ugu mahadsantahay. 🎉')
      next()
    } catch (err) {
      push('Gudbinta ayaa ku dambeysay: ' + (err.message || 'error'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card p-4 p-md-5">
            <div className="text-center mb-4">
              <h4 className="fw-bold">Duubista Codka</h4>
              <div className="text-muted small">Akhriso jumlada hoose si cad, markaas ku duub codkaaga.</div>
            </div>

            <div className="glass rounded-4 p-4 text-center mb-4" style={{ minHeight: 110 }}>
              <p className="fs-5 fw-semibold lh-lg mb-0">{current?.text}</p>
            </div>

            {micError && (
              <div className="alert alert-warning py-2 small">
                <i className="bi bi-exclamation-triangle me-1i" />{micError}
              </div>
            )}

            <div className="text-center mb-3">
              <div className={`fs-1 fw-bold ${state === recording ? 'text-danger rec-pulse' : 'text-lime'}`}>{fmt(elapsed)}</div>
            </div>

            <div className="wavebox mb-4">
              {state === recording
                ? Array.from({ length: 15 }).map((_, i) => <span key={i} style={{ animationDelay: `${i * 0.07}s` }} />)
                : Array.from({ length: 15 }).map((_, i) => <span key={i} style={{ height: 12, animation: 'none', opacity: 0.25 }} />)}
            </div>

            <div className="d-flex justify-content-center gap-3 flex-wrap mb-4">
              {state === idle && (
                <button className="btn btn-lime btn-lg px-4" onClick={startRecording}>
                  <i className="bi bi-mic-fill me-2" /> Start Recording
                </button>
              )}
              {state === recording && (
                <button className="btn btn-danger btn-lg px-4 rec-pulse" onClick={stopRecording}>
                  <i className="bi bi-stop-fill me-2" /> Stop
                </button>
              )}
              {(state === recorded || state === playing) && (
                <>
                  <button className="btn btn-outline-lime btn-lg px-4" onClick={playBack} disabled={state === playing}>
                    <i className="bi bi-play-fill me-2" /> Listen
                  </button>
                  <button className="btn btn-outline-secondary btn-lg px-4" onClick={next}>
                    <i className="bi bi-arrow-repeat me-2" /> Retry
                  </button>
                </>
              )}
            </div>

            <audio id="player" src={audioUrl || undefined} className="d-none" />

            {state === recorded && (
              <div className="row g-3 mt-2 border-top pt-4">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Gender</label>
                  <select className="form-select" value={meta.gender} onChange={(e) => setMeta({ ...meta, gender: e.target.value })}>
                    <option value="">Select gender...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Age Group</label>
                  <select className="form-select" value={meta.age} onChange={(e) => setMeta({ ...meta, age: e.target.value })}>
                    <option value="">Select age group...</option>
                    <option value="13-17">13-17</option>
                    <option value="18-29">18-29</option>
                    <option value="30-49">30-49</option>
                    <option value="50-64">50-64</option>
                    <option value="65+">65+</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">
                    Noise level <span className="text-lime">({meta.noise}/5)</span>
                  </label>
                  <input type="range" className="form-range" min="1" max="5" value={meta.noise} onChange={(e) => setMeta({ ...meta, noise: +e.target.value })} />
                </div>
                <div className="col-12 d-flex justify-content-end mt-4">
                  <button className="btn btn-lime btn-lg px-5 mt-1" onClick={submit} disabled={busy}>
                    {busy ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-check2-circle me-2" />}
                    Submit
                  </button>
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
  return 'Unknown'
}