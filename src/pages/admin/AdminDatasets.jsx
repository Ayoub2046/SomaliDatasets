import { useEffect, useMemo, useState, useRef } from 'react'
import { data } from '../../services/dataService'
import { useToast } from '../../components/ui/Toast'
import PageHeader from '../../components/PageHeader'

const FILTERS = ['all', 'pending', 'accepted', 'rejected']

function StatusBadge({ s }) {
  const map = { accepted: 'success', rejected: 'danger', pending: 'warning' }
  return <span className={`badge text-bg-${map[s] || 'secondary'} px-2 py-1`}>{s}</span>
}

export default function AdminDatasets() {
  const { push } = useToast()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [playingAudioId, setPlayingAudioId] = useState(null)

  const audioRef = useRef(null)

  const load = (f = filter) => {
    setLoading(true)
    data
      .getDatasets({ limit: 400, status: f === 'all' ? undefined : f })
      .then((res) => {
        setRows(res || [])
        setSelectedIds([])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load('all')
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter(
      (d) =>
        d.sentence?.toLowerCase().includes(q) ||
        d.username?.toLowerCase().includes(q)
    )
  }, [rows, query])

  async function act(id, status) {
    setBusyId(id)
    try {
      await data.setStatus(id, status)
      push(status === 'accepted' ? 'Waa la aqbalay ✓' : 'Waa la diiday ✗')
      load(filter)
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(id) {
    if (!confirm('Ma hubtaa inaad tirtayso dataset-kan?')) return
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

  // Bulk Actions
  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map((d) => d.id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function bulkApprove() {
    if (selectedIds.length === 0) return
    setLoading(true)
    try {
      for (const id of selectedIds) {
        await data.setStatus(id, 'accepted')
      }
      push(`${selectedIds.length} recordings approved! ✓`)
      load(filter)
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function bulkReject() {
    if (selectedIds.length === 0) return
    setLoading(true)
    try {
      for (const id of selectedIds) {
        await data.setStatus(id, 'rejected')
      }
      push(`${selectedIds.length} recordings rejected. ✗`)
      load(filter)
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function playAudio(d) {
    if (!d.audio_url) {
      push('Faylkan audio-ga ma laha link playable ah.', 'warning')
      return
    }

    if (playingAudioId === d.id && audioRef.current) {
      audioRef.current.pause()
      setPlayingAudioId(null)
      return
    }

    if (audioRef.current) audioRef.current.pause()

    const audio = new Audio(d.audio_url)
    audio.playbackRate = playbackSpeed
    audioRef.current = audio
    setPlayingAudioId(d.id)

    audio
      .play()
      .then(() => {
        audio.onended = () => setPlayingAudioId(null)
      })
      .catch(() => {
        setPlayingAudioId(null)
        push('Error playing audio.', 'error')
      })
  }

  return (
    <div>
      <PageHeader
        icon="bi-list-check"
        title="Dawasashada Datasets-ka"
        subtitle="Dib u eeg, ansixi (Approve), diid (Reject) ama tirtir duubiska codadka"
        action={
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted fw-semibold">Xawaaraha (Speed):</span>
            <select
              className="form-select form-select-sm bg-soft text-lime border-secondary border-opacity-25"
              style={{ width: 85 }}
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(+e.target.value)}
            >
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2.0x</option>
            </select>
          </div>
        }
      />

      {/* Filter and Bulk Action Toolbar */}
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div className="d-flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const count =
              f === 'all' ? rows.length : rows.filter((r) => r.status === f).length
            return (
              <button
                key={f}
                className={`btn btn-sm ${
                  filter === f ? 'btn-lime fw-bold' : 'btn-outline-lime'
                }`}
                onClick={() => {
                  setFilter(f)
                  load(f)
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}{' '}
                <span className="opacity-75">({count})</span>
              </button>
            )
          })}
        </div>

        <div className="d-flex align-items-center gap-2 ms-auto">
          {selectedIds.length > 0 && (
            <div className="btn-group btn-group-sm">
              <button className="btn btn-success fw-bold" onClick={bulkApprove}>
                <i className="bi bi-check-all me-1" /> Approve ({selectedIds.length})
              </button>
              <button className="btn btn-danger fw-bold" onClick={bulkReject}>
                <i className="bi bi-x-circle me-1" /> Reject ({selectedIds.length})
              </button>
            </div>
          )}

          <div className="input-group input-group-sm" style={{ width: 220 }}>
            <span className="input-group-text bg-soft border-secondary border-opacity-25">
              <i className="bi bi-search" />
            </span>
            <input
              className="form-control bg-soft text-white border-secondary border-opacity-25"
              placeholder="Search dataset..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Datasets Table */}
      <div className="card p-3 brand-ring">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-lime mb-2" />
            <div className="text-muted small">Soo raraya datasets-ka...</div>
          </div>
        ) : (
          <div className="table-responsive" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
            <table className="table table-lime table-hover align-middle mb-0">
              <thead className="sticky-top bg-dark">
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={
                        filtered.length > 0 && selectedIds.length === filtered.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Jumlada</th>
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
                  <tr key={d.id} className={selectedIds.includes(d.id) ? 'table-active' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedIds.includes(d.id)}
                        onChange={() => toggleSelect(d.id)}
                      />
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      <span className="d-inline-block text-truncate fw-semibold" style={{ maxWidth: 300 }}>
                        {d.sentence}
                      </span>
                    </td>
                    <td className="text-muted small">{d.username}</td>
                    <td className="small">{d.duration ? `${d.duration.toFixed(1)}s` : '3.0s'}</td>
                    <td className="text-lime small">{'★'.repeat(Math.max(1, d.noise || 1))}</td>
                    <td className="text-muted small">{d.age_group || '18-29'}</td>
                    <td>
                      <StatusBadge s={d.status} />
                    </td>
                    <td className="text-end text-nowrap">
                      {busyId === d.id ? (
                        <span className="spinner-border spinner-border-sm text-lime" />
                      ) : (
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-lime"
                            title="Play Audio"
                            onClick={() => playAudio(d)}
                          >
                            <i
                              className={`bi ${
                                playingAudioId === d.id ? 'bi-pause-fill text-lime' : 'bi-play-fill'
                              }`}
                            />
                          </button>

                          {d.status !== 'accepted' && (
                            <button
                              className="btn btn-success"
                              title="Accept"
                              onClick={() => act(d.id, 'accepted')}
                            >
                              <i className="bi bi-check-lg" />
                            </button>
                          )}
                          {d.status !== 'rejected' && (
                            <button
                              className="btn btn-danger"
                              title="Reject"
                              onClick={() => act(d.id, 'rejected')}
                            >
                              <i className="bi bi-x-lg" />
                            </button>
                          )}
                          <button
                            className="btn btn-outline-secondary"
                            title="Delete"
                            onClick={() => remove(d.id)}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">
                      Ma jiraan dataset-yo ku habboon ilaa hadda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}