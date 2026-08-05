import { useEffect, useState } from 'react'
import { data } from '../../services/dataService'
import { useToast } from '../../components/ui/Toast'
import PageHeader from '../../components/PageHeader'

export default function AdminSentences() {
  const { push } = useToast()
  const [rows, setRows] = useState([])
  const [text, setText] = useState('')
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
    push('Jumlad waa la daray.')
    load()
  }

  async function saveEdit(id) {
    if (!editText.trim()) return
    await data.updateSentence(id, { text: editText.trim() })
    setEditId(null)
    push('Jumlada waa la cusboonaysiiyay.')
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
      <PageHeader icon="bi-fonts" title="Sentences" subtitle="Maamul jumladaha codka" />

      <div className="card p-4 mb-4">
        <h6 className="fw-bold mb-3">Add new sentence</h6>
        <form onSubmit={add} className="d-flex gap-2 align-items-center">
          <input
            className="form-control"
            placeholder="Qor jumlad Af-Soomaali ah..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <button className="btn btn-lime text-nowrap">
            <i className="bi bi-plus-lg me-1" /> Add
          </button>
        </form>
      </div>

      <div className="card p-3">
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-lime" /></div>
        ) : (
          <div className="table-responsive">
            <table className="table table-lime align-middle">
              <thead>
                <tr><th>#</th><th>Text</th><th>Language</th><th className="text-end">Actions</th></tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <tr key={s.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td>
                      {editId === s.id ? (
                        <div className="d-flex gap-2">
                          <input className="form-control form-control-sm" value={editText} onChange={(e) => setEditText(e.target.value)} />
                          <button className="btn btn-sm btn-lime" onClick={() => saveEdit(s.id)}><i className="bi bi-check" /></button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditId(null)}><i className="bi bi-x" /></button>
                        </div>
                      ) : (
                        <span>{s.text}</span>
                      )}
                    </td>
                    <td className="text-muted">{s.language || 'so'}</td>
                    <td className="text-end">
                      {editId !== s.id && (
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-lime" title="Edit" onClick={() => { setEditId(s.id); setEditText(s.text) }}>
                          <i className="bi bi-pencil" />
                          </button>
                          <button className="btn btn-outline-secondary" title="Delete" onClick={() => remove(s.id)}>
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-4">Kuma jiraan jumlado.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}