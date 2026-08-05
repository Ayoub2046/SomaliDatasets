import { useEffect, useState } from 'react'
import { data, IS_LIVE } from '../../services/dataService'
import PageHeader from '../../components/PageHeader'
import { useToast } from '../../components/ui/Toast'
import { CONFIG } from '../../config/config'

export default function AdminSettings() {
  const { push } = useToast()
  const [rows, setRows] = useState([])
  const [pushing, setPushing] = useState(false)
  const [pushedAt, setPushedAt] = useState(() => localStorage.getItem('caa_hf_push') || null)

  useEffect(() => {
    data.getDatasets({ limit: 1000 }).then(setRows).catch(() => {})
  }, [])

  function download(name, content, type) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  function esc(v) {
    return `"${String(v ?? '').replaceAll('"', '""')}"`
  }

  async function exportMetadata() {
    const accepted = rows.filter((r) => r.status === 'accepted')
    const header = ['client_id', 'path', 'sentence', 'gender', 'age_group', 'duration', 'noise', 'device', 'browser', 'created_at']
    const lines = accepted.map((r) =>
      [r.id, r.audio_url || r.id + '.webm', r.sentence, r.gender, r.age_group, r.duration, r.noise, r.device, r.browser, r.created_at].map(esc).join(','),
    )
    download('metadata.csv', '\uFEFF' + [header.join(','), ...lines].join('\n'), 'text/csv')
    push(`Metadata CSV exported (${accepted.length} clips).`)
  }

  async function exportFull() {
    const header = ['id', 'sentence', 'user', 'duration', 'gender', 'age_group', 'noise', 'device', 'browser', 'status', 'created_at']
    const lines = rows.map((r) =>
      [r.id, r.sentence, r.username, r.duration, r.gender, r.age_group, r.noise, r.device, r.browser, r.status, r.created_at].map(esc).join(','),
    )
    download('datasets.csv', '\uFEFF' + [header.join(','), ...lines].join('\n'), 'text/csv')
    push('Full datasets CSV exported.')
  }

  async function pushHF() {
    setPushing(true)
    await new Promise((r) => setTimeout(r, 1200))
    const now = new Date().toISOString()
    localStorage.setItem('caa_hf_push', now)
    setPushedAt(now)
    setPushing(false)
    push('Dataset pushed to Hugging Face (demo trigger).')
  }

  const acceptedCount = rows.filter((r) => r.status === 'accepted').length

  return (
    <div>
      <PageHeader icon="bi-gear" title="Settings & Export" subtitle="Maamulidda soo-saarista dataset-ka" />

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-filetype-csv text-lime me-2" />Export CSV</h6>
            <p className="small text-muted">
              Export the accepted clips into a <code>metadata.csv</code> ready for a Hugging Face~dataset repository.
              Currently <b className="text-lime">{acceptedCount.toLocaleString()}</b> accepted clips ready to export.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-lime" onClick={exportMetadata}>
                <i className="bi bi-download me-1" />Export metadata.csv
              </button>
              <button className="btn btn-outline-secondary" onClick={exportFull}>
                <i className="bi bi-table me-1" />Export full datasets CSV
              </button>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-rocket-takeoff text-lime me-2" />Hugging Face sync</h6>
            <div className="small text-muted mb-3">
              Files pushed automatically after review:
              <ul className="my-2 ps-3 mb-1">
                <li><code>audio/</code> — sound clips</li>
                <li><code>metadata.csv</code> — transcripts</li>
              </ul>
            </div>
            <button className="btn btn-lime w-100" onClick={pushHF} disabled={pushing}>
              {pushing ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-cloud-arrow-up me-2" />}
              {pushedAt ? 'Push to Hugging Face again' : 'Push to Hugging Face'}
            </button>
            {pushedAt && (
              <div className="alert alert-success small mt-3 mb-0">
                <i className="bi bi-check-circle me-1" />Last push: {new Date(pushedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div className="col-12">
          <div className="card p-4">
            <h6 className="fw-bold mb-3"><i className="bi bi-shield-check text-lime me-2" />Service info</h6>
            <table className="table table-lime mb-0 align-middle">
              <tbody>
                <tr>
                  <td>Mode</td>
                  <td>
                    {IS_LIVE ? <span className="badge text-bg-success">Production (Supabase)</span> : <span className="badge text-bg-warning">Demo (in-browser mock)</span>}
                  </td>
                </tr>
                <tr><td>Supabase URL</td><td>{IS_LIVE ? CONFIG.supabaseUrl : 'Set VITE_SUPABASE_URL to enable'}</td></tr>
                <tr><td>Dataset licence</td><td>CC-BY-4.0 · Audio CC0</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}