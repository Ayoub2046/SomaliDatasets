import { useEffect, useState } from 'react'
import { data } from '../../services/dataService'
import { useToast } from '../../components/ui/Toast'
import PageHeader from '../../components/PageHeader'

export default function AdminSentences() {
  const { push } = useToast()
  const [rows, setRows] = useState([])
  const [text, setText] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState('')

  const load = () => {
    setLoading(true)
    data.getSentences().then(setRows).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function add(e) {
    e.preventDefault()
    if (!text.trim()) return
    await data.addSentence(text.trim())
    setText('')
    push('Jumlad waa la daray. ✓')
    load()
  }

  async function handleBulkImport() {
    if (!bulkText.trim()) return
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 2)

    if (lines.length === 0) {
      push('Fadlan qor ama ku soo dheji jumlado shaqaynaya.', 'warning')
      return
    }

    setLoading(true)
    try {
      for (const line of lines) {
        await data.addSentence(line)
      }
      push(`${lines.length} jumlado ayaa si guul leh loogu soo daray! 🎉`)
      setBulkText('')
      setShowBulkModal(false)
      load()
    } catch (err) {
      push('Guuldarro: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function saveEdit(id) {
    if (!editText.trim()) return
    await data.updateSentence(id, { text: editText.trim() })
    setEditId(null)
    push('Jumlada waa la cusboonaysiiyay. ✓')
    load()
  }

  async function remove(id) {
    if (!confirm('Hubi inaad tirtayso jumladdan?')) return
    await data.deleteSentence(id)
    push('Jumlad waa la tirtay.')
    load()
  }

  return (
    <div>
      <PageHeader
        icon="bi-fonts"
        title="Maamulka Jumladaha (Sentences)"
        subtitle="Ku dar ama maamul jumladaha lagu duubayo studio-ha"
        action={
          <button
            className="btn btn-lime btn-sm fw-bold"
            onClick={() => setShowBulkModal(true)}
          >
            <i className="bi bi-file-earmark-text me-1" /> Bulk Import
          </button>
        }
      />

      {/* Single Add Card */}
      <div className="card p-4 mb-4 brand-ring">
        <h6 className="fw-bold mb-3">Ku dar Jumlad Cusub (Single)</h6>
        <form onSubmit={add} className="d-flex gap-2 align-items-center">
          <input
            className="form-control bg-soft text-white border-secondary border-opacity-25"
            placeholder="Qor jumlad Af-Soomaali ah..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <button className="btn btn-lime text-nowrap fw-bold">
            <i className="bi bi-plus-lg me-1" /> Add Sentence
          </button>
        </form>
      </div>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="modal show d-block tab-index-1" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content glass border-lime">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-file-earmark-text text-lime me-2" />
                  Bulk Import Sentences
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowBulkModal(false)}
                />
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-2">
                  Ku soo dheji (paste) jumladaha Af-Soomaaliga ah. Mid kasta khad gaar ah ha ugu jirtay (Line by line):
                </p>
                <textarea
                  className="form-control bg-dark text-lime border-secondary border-opacity-25 font-monospace"
                  rows={8}
                  placeholder={`CaawiyeAI waa madal xor ah oo lagu uruurinayo codka Af-Soomaaliga.\nTignoolajiyada AI waxay beddeleysaa habka aan u shaqeyno.\nCodkaagu wuxuu leeyahay qiimo weyn.`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowBulkModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-lime fw-bold"
                  onClick={handleBulkImport}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-2" />
                  ) : (
                    <i className="bi bi-cloud-upload me-2" />
                  )}
                  Import All Sentences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sentences Table */}
      <div className="card p-3 brand-ring">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-lime mb-2" />
            <div className="text-muted small">Soo raraya jumladaha...</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-lime align-middle mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Jumlada</th>
                  <th>Luuqadda</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <tr key={s.id}>
                    <td className="text-muted fw-bold">{i + 1}</td>
                    <td>
                      {editId === s.id ? (
                        <div className="d-flex gap-2">
                          <input
                            className="form-control form-control-sm bg-dark text-white border-lime"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                          />
                          <button
                            className="btn btn-sm btn-lime"
                            onClick={() => saveEdit(s.id)}
                          >
                            <i className="bi bi-check" />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setEditId(null)}
                          >
                            <i className="bi bi-x" />
                          </button>
                        </div>
                      ) : (
                        <span className="fw-semibold text-white">{s.text}</span>
                      )}
                    </td>
                    <td className="text-muted small">{s.language || 'so'}</td>
                    <td className="text-end">
                      {editId !== s.id && (
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-lime"
                            title="Edit"
                            onClick={() => {
                              setEditId(s.id)
                              setEditText(s.text)
                            }}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            className="btn btn-outline-secondary"
                            title="Delete"
                            onClick={() => remove(s.id)}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      Kuma jiraan jumlado database-ka.
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