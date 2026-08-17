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

  // State untuk "Edit" inline per row. editingIndex null = tak ada edit aktif.
  const [editingIndex, setEditingIndex] = useState(null)
  const [editDraft, setEditDraft] = useState(null)

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

  // Validasi bersama utk Tambah & Edit: placeholder {tmdb_id} + TV wajib bila bukan movie.
  // Kembalikan pesan error ('' bila valid). mediaType '' = null (keduanya).
  function validateTemplate(movieUrl, tvUrl, mediaType) {
    if (!movieUrl.trim() || !movieUrl.includes('{tmdb_id}')) {
      return 'URL Template Movie wajib diisi dan memuat placeholder {tmdb_id}.'
    }
    if (mediaType !== 'movie' && !tvUrl.trim()) {
      return 'URL Template TV wajib diisi bila Media Type bukan Movie.'
    }
    return ''
  }

  // Tambah provider baru ke daftar (id dibuat server saat Simpan).
  function onAddProvider(e) {
    e.preventDefault()
    setError('')
    const validationError = validateTemplate(addMovieUrl, addTvUrl, addMediaType)
    if (validationError) {
      setError(validationError)
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

  function onEditBegin(i) {
    setEditingIndex(i)
    setEditDraft({ ...providers[i] })
  }

  function onEditCancel() {
    setEditingIndex(null)
    setEditDraft(null)
  }

  function onEditSave() {
    setError('')
    if (!editDraft) return
    const d = editDraft
    const validationError = validateTemplate(d.movie_url || '', d.tv_url || '', d.media_type ?? '')
    if (validationError) {
      setError(validationError)
      return
    }
    setProviders((prev) =>
      prev.map((p, j) =>
        j === editingIndex
          ? {
              ...p,
              ...d,
              label: (d.label || '').trim() || 'embed',
              movie_url: d.movie_url.trim(),
              tv_url: d.tv_url.trim() || null,
            }
          : p
      )
    )
    onEditCancel()
  }

  // Geser provider naik (dir=-1) / turun (dir=+1). Disable di tepi saat render.
  function onMove(i, dir) {
    const j = i + dir
    if (j < 0 || j >= providers.length) return
    const next = [...providers]
    ;[next[i], next[j]] = [next[j], next[i]]
    setProviders(next)
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
        {providers.map((p, i) =>
          editingIndex === i ? (
            <div className="provider-item editing" key={i}>
              <div className="provider-form">
                <label>
                  Label
                  <input
                    className="field"
                    type="text"
                    value={editDraft?.label ?? ''}
                    placeholder="embed"
                    onChange={(e) => setEditDraft((d) => ({ ...d, label: e.target.value }))}
                  />
                </label>
                <label>
                  Media Type
                  <select
                    className="field"
                    value={editDraft?.media_type ?? ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, media_type: e.target.value === '' ? null : e.target.value }))}
                  >
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
                    value={editDraft?.movie_url ?? ''}
                    placeholder="https://.../{tmdb_id}"
                    onChange={(e) => setEditDraft((d) => ({ ...d, movie_url: e.target.value }))}
                  />
                </label>
                <label>
                  URL Template TV
                  <input
                    className="field"
                    type="text"
                    value={editDraft?.tv_url ?? ''}
                    placeholder="https://.../{tmdb_id}/{season}/{episode}"
                    onChange={(e) => setEditDraft((d) => ({ ...d, tv_url: e.target.value }))}
                  />
                </label>
                <label className="provider-toggle">
                  <input
                    type="checkbox"
                    checked={editDraft?.enabled ?? false}
                    onChange={(e) => setEditDraft((d) => ({ ...d, enabled: e.target.checked }))}
                  />{' '}
                  Aktif
                </label>
                <div className="form-actions">
                  <button type="button" className="btn btn-sm" onClick={onEditCancel}>
                    Batal
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={onEditSave}>
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="provider-item" key={i}>
              <span className="provider-main">
                <strong>{p.label}</strong> <span className="badge">embed</span>
                <span className="badge">{mediaTypeLabel(p.media_type)}</span>
                <span className="urls">
                  {p.movie_url}
                  {p.tv_url && (
                    <>
                      <br />
                      {p.tv_url}
                    </>
                  )}
                </span>
              </span>
              <div className="provider-reorder" title="Urutkan provider">
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={i === 0 || editingIndex !== null}
                  onClick={() => onMove(i, -1)}
                  aria-label="Naikkan urutan"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={i === providers.length - 1 || editingIndex !== null}
                  onClick={() => onMove(i, 1)}
                  aria-label="Turunkan urutan"
                >
                  ↓
                </button>
              </div>
              <label className="provider-toggle">
                <input
                  type="checkbox"
                  checked={p.enabled}
                  onChange={() => onToggleEnabled(i)}
                />{' '}
                Aktif
              </label>
              <div className="entry-actions">
                <button type="button" className="btn btn-sm" onClick={() => onEditBegin(i)}>
                  Ubah
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  disabled={editingIndex !== null}
                  onClick={() => onRemove(i)}
                >
                  Hapus
                </button>
              </div>
            </div>
          )
        )}

        <h4>Tambah Provider</h4>
        <div className="provider-form">
          <div className="form-row">
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
          </div>

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

          <div className="form-row provider-form-foot">
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
          </div>
        </div>
      </form>
    </div>
  )
}
