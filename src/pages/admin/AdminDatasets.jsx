import { useEffect, useMemo, useState } from 'react'
import { data } from '../../services/dataService'
import { useToast } from '../../components/ui/Toast'
import PageHeader from '../../components/PageHeader'

const FILTERS = ['all', 'pending', 'accepted', 'rejected']

function StatusBadge({ s }) {
  const map = { accepted: 'success', rejected: 'danger', pending: 'warning' }
  return <span className={`badge text-bg-${map[s] || 'secondary'}`}>{s}</span>
}

export default function AdminDatasets() {
  const { push } = useToast()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = (f = filter) => {
    setLoading(true)
    data
      .getDatasets({ limit: 300, status: f === 'all' ? undefined : f })
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    return rows.filter((d) => d.sentence?.toLowerCase().includes(query.toLowerCase()) || d.username?.toLowerCase().includes(query.toLowerCase()))
  }, [rows, query])

  async function act(id, status) {
    setBusyId(id)
    try {
      await data.setStatus(id, status)
      push(status === 'accepted' ? 'La aqbalay ✓' : 'La diiday ✗')
      load(filter)
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(id) {
    if (!confirm('Hubi inaad tirtayso dataset-ka?')) return
    setBusyId(id)
    try {
      await data.deleteDataset(id)
      push('Dataset-ka waa la tirtay.')
      load(filter)
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader icon="bi-list-check" title="Review Datasets" subtitle="Accept, reject ama tirtir duubista" />

      <div className="d-flex flex-wrap gap-2 mb-3">
        {FILTERS.map((f) => {
          const count = f === 'all' ? rows.length : rows.filter((r) => r.status === f).length
          return (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-lime' : 'btn-outline-lime'}`}
              onClick={() => {
                setFilter(f)
                load(f)
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} <span className="opacity-75">({count})</span>
            </button>
          )
        })}
        <div className="ms-auto">
          <div className="input-group input-group-sm w-auto">
            <span className="input-group-text"><i className="bi bi-search" /></span>
            <input className="form-control" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card p-3">
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-lime" /></div>
        ) : (
          <div className="table-responsive" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
            <table className="table table-lime table-hover align-middle">
              <thead className="sticky-top">
                <tr>
                  <th>Sentence</th>
                  <th>Contributor</th>
                  <th>Duration</th>
                  <th>Noise</th>
                  <th>Age</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td style={{ maxWidth: 320 }}><span className="d-inline-block text-truncate" style={{ maxWidth: 320 }}>{d.sentence}</span></td>
                    <td className="text-muted">{d.username}</td>
                    <td>{d.duration?.toFixed(1)}s</td>
                    <td>{'★'.repeat(Math.max(1, d.noise || 1))}</td>
                    <td className="text-muted">{d.age_group || '—'}</td>
                    <td><StatusBadge s={d.status} /></td>
                    <td className="text-end text-nowrap">
                      {busyId === d.id ? (
                        <span className="spinner-border spinner-border-sm text-lime" />
                      ) : (
                        <div className="btn-group btn-group-sm">
                          {d.status !== 'accepted' && (
                            <button className="btn btn-success" title="Accept" onClick={() => act(d.id, 'accepted')}>
                              <i className="bi bi-check-lg" />
                            </button>
                          )}
                          {d.status !== 'rejected' && (
                            <button className="btn btn-danger" title="Reject" onClick={() => act(d.id, 'rejected')}>
                              <i className="bi bi-x-lg" />
                            </button>
                          )}
                          <button className="btn btn-outline-secondary" title="Delete" onClick={() => remove(d.id)}>
                            <i className="bi bi-trash" />
                          </button>
                          {d.audio_url && (
                            <button className="btn btn-outline-lime" title="Listen" onClick={() => { const a = new window.Audio(d.audio_url); a.play() }}>
                              <i className="bi bi-volume-up" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted py-4">Ma jiraan dataset-yo ku habboon.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}