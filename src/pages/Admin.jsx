import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminApi } from '../lib/api'

function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} menit lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.floor(h / 24)
  return `${d} hari lalu`
}

export default function Admin() {
  const [entries, setEntries] = useState([])
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setEntries(await adminApi.listEntries(filter || undefined))
    } catch (err) {
      if (err.authExpired) {
        navigate('/admin/login', { state: { expired: true }, replace: true })
        return
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filter, navigate])

  useEffect(() => {
    load()
  }, [load])

  async function onDelete(entry) {
    if (!window.confirm(`Hapus "${entry.title}"? Aksi ini tidak bisa dibatalkan.`)) return
    try {
      await adminApi.deleteEntry(entry.id)
      load()
    } catch (err) {
      if (err.authExpired) {
        navigate('/admin/login', { state: { expired: true }, replace: true })
        return
      }
      setError(err.message)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <Link to="/admin/entry" className="btn btn-primary">+ Tambah Entri Baru</Link>
        <select className="field" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {error && <p className="error-box">{error}</p>}
      {loading && <p className="hint">Memuat entri...</p>}

      {!loading && entries.length === 0 && (
        <p className="hint">Belum ada entri{filter ? ` dengan status "${filter}"` : ''}. Klik "Tambah Entri Baru" untuk mulai.</p>
      )}

      <div className="entry-list">
        {entries.map((e) => (
          <div className="entry-card" key={e.id}>
            <div className="entry-info">
              <h3>{e.title || '(tanpa judul)'}</h3>
              <p>
                <span className={`badge badge-${e.status}`}>{e.status === 'published' ? 'Published' : 'Draft'}</span>{' '}
                <span className="badge">{e.type === 'tv' ? 'Series' : 'Film'}</span>{' '}
                TMDB #{e.tmdb_id}
              </p>
              <p className="entry-meta">
                Video: {e.video_url ? (e.video_type || 'hls').toUpperCase() : e.episodes?.length ? `${e.episodes.length} episode` : '—'}
                {' · '}Diperbarui {relTime(e.updated_at)}
              </p>
            </div>
            <div className="entry-actions">
              <Link to={`/admin/entry/${e.id}`} className="btn btn-ghost btn-sm">Edit</Link>
              <button className="btn btn-ghost btn-sm btn-danger" onClick={() => onDelete(e)}>Hapus</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
