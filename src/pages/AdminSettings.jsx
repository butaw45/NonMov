import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../lib/api'

export default function AdminSettings() {
  const navigate = useNavigate()

  // Pool provider global (config.json → providers[]). id dibuat server.
  const [providers, setProviders] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // State sementara untuk form "Tambah Provider"
  const [addLabel, setAddLabel] = useState('')
  const [addMovieUrl, setAddMovieUrl] = useState('')
  const [addTvUrl, setAddTvUrl] = useState('')
  const [addMediaType, setAddMediaType] = useState('') // '' = null (keduanya)
  const [addEnabled, setAddEnabled] = useState(true)

  useEffect(() => {
    adminApi
      .getConfig()
      .then((c) => {
        setProviders(c.providers || [])
      })
      .catch((err) => {
        if (err.authExpired) {
          navigate('/admin/login', { state: { expired: true }, replace: true })
          return
        }
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [navigate])

  const mediaTypeLabel = (mt) =>
    mt === 'movie' ? 'Movie' : mt === 'tv' ? 'TV' : 'Movie + TV'

  // Tambah provider baru ke daftar (id dibuat server saat Simpan).
  function onAddProvider(e) {
    e.preventDefault()
    setError('')
    if (!addMovieUrl.trim() || !addMovieUrl.includes('{tmdb_id}')) {
      setError('URL Template Movie wajib diisi dan memuat placeholder {tmdb_id}.')
      return
    }
    // Media Type bukan "movie" (null=keduanya atau tv) → TV wajib (server juga menolak).
    if (addMediaType !== 'movie' && !addTvUrl.trim()) {
      setError('URL Template TV wajib diisi bila Media Type bukan Movie.');
      return
    }
    setProviders([
      ...providers,
      {
        type: 'embed',
        label: addLabel.trim() || 'embed',
        movie_url: addMovieUrl.trim(),
        tv_url: addTvUrl.trim() || null,
        media_type: addMediaType === '' ? null : addMediaType,
        enabled: addEnabled,
      },
    ])
    // reset form
    setAddLabel('')
    setAddMovieUrl('')
    setAddTvUrl('')
    setAddMediaType('')
    setAddEnabled(true)
  }

  function onToggleEnabled(i) {
    setProviders(providers.map((p, j) => (j === i ? { ...p, enabled: !p.enabled } : p)))
  }

  function onRemove(i) {
    setProviders(providers.filter((_, j) => j !== i))
  }

  async function onSave(e) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      // Kirim shape lengkap incl. id bila ada — server hanya bikin id utk item baru.
      await adminApi.updateConfig({
        providers,
      })
      setSaved(true)
    } catch (err) {
      if (err.authExpired) {
        navigate('/admin/login', { state: { expired: true }, replace: true })
        return
      }
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="admin-page"><p className="hint">Memuat pengaturan...</p></div>

  return (
    <div className="admin-page">
      <h1>Pengaturan Provider</h1>
      {error && <p className="error-box">{error}</p>}
      {saved && <p className="hint">Pengaturan tersimpan.</p>}

      <form className="admin-card" onSubmit={onSave}>
        <h3>Provider Global</h3>
        <p className="hint">
          Pool penyedia tontonan yang dipakai semua judul (kecuali ada override
          self-hosted per judul). Matikan/nyalakan toggle untuk aktif-nonaktif.
        </p>

        {providers.length === 0 && (
          <p className="hint">Belum ada provider. Tambahkan di bawah.</p>
        )}
        {providers.map((p, i) => (
          <div className="provider-item" key={i}>
            <span>
              <strong>{p.label}</strong> <span className="badge">embed</span>
              <span className="badge">{mediaTypeLabel(p.media_type)}</span>
            </span>
            <span
              style={{
                display: 'block',
                color: 'var(--mut)',
                fontSize: 12,
                wordBreak: 'break-all',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {p.movie_url}
              {p.tv_url && (
                <>
                  <br />
                  {p.tv_url}
                </>
              )}
            </span>
            <label className="provider-toggle">
              <input
                type="checkbox"
                checked={p.enabled}
                onChange={() => onToggleEnabled(i)}
              />{' '}
              Aktif
            </label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRemove(i)}>
              Hapus
            </button>
          </div>
        ))}

        <h4>Tambah Provider</h4>
        <label>
          Label
          <input
            className="field"
            type="text"
            value={addLabel}
            placeholder="embed"
            onChange={(e) => setAddLabel(e.target.value)}
          />
        </label>

        <label>
          Media Type
          <select className="field" value={addMediaType} onChange={(e) => setAddMediaType(e.target.value)}>
            <option value="">Movie + TV (semua)</option>
            <option value="movie">Movie</option>
            <option value="tv">TV</option>
          </select>
        </label>

        <label>
          URL Template Movie (wajib)
          <input
            className="field"
            type="text"
            value={addMovieUrl}
            placeholder="https://.../{tmdb_id}"
            onChange={(e) => setAddMovieUrl(e.target.value)}
          />
        </label>

        <label>
          URL Template TV
          <input
            className="field"
            type="text"
            value={addTvUrl}
            placeholder="https://.../{tmdb_id}/{season}/{episode}"
            onChange={(e) => setAddTvUrl(e.target.value)}
          />
        </label>

        <label className="provider-toggle">
          <input
            type="checkbox"
            checked={addEnabled}
            onChange={(e) => setAddEnabled(e.target.checked)}
          />{' '}
          Aktif
        </label>

        <div className="form-actions">
          <button type="button" className="btn" onClick={onAddProvider}>
            Tambah Provider
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  )
}
