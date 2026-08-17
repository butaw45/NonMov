import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { adminApi } from '../lib/api'
import { img } from '../lib/tmdb'
import { normalizeProvider, flatToProviders } from '../lib/providers'

export default function AdminEntry() {
  const { id } = useParams() // ada = mode edit
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  // Pencarian TMDB (hanya mode tambah)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null = belum cari
  const [searching, setSearching] = useState(false)

  // Form fields
  const [picked, setPicked] = useState(null) // hasil TMDB yang dipilih
  const [manualId, setManualId] = useState('')
  const [manualType, setManualType] = useState('movie')
  const [status, setStatus] = useState('draft')
  const [title, setTitle] = useState('')

  // Penyedia tontonan (array Provider: self hanya — override per judul)
  const [providers, setProviders] = useState([])
  // State sementara untuk form "Tambah Provider"
  const [addOpen, setAddOpen] = useState(false)
  const [addType, setAddType] = useState('self')
  const [addUrl, setAddUrl] = useState('')
  const [addVideoType, setAddVideoType] = useState('hls')
  const [addLabel, setAddLabel] = useState('')
  const [addError, setAddError] = useState('')

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingEntry, setLoadingEntry] = useState(isEdit)

  // Mode edit: ambil data entri
  useEffect(() => {
    if (!isEdit) return
    adminApi
      .getEntry(id)
      .then((e) => {
        setTitle(e.title || '')
        setManualId(String(e.tmdb_id))
        setManualType(e.type)
        setStatus(e.status || 'draft')
        // Penyedia: prefer providers[] tersimpan (self only), fallback ke flat legacy
        if (e.providers?.length)
          setProviders(e.providers.map(normalizeProvider).filter((p) => p && p.type === 'self'))
        else setProviders(flatToProviders(e))
      })
      .catch((err) => {
        if (err.authExpired) {
          navigate('/admin/login', { state: { expired: true }, replace: true })
          return
        }
        setError(err.message)
      })
      .finally(() => setLoadingEntry(false))
  }, [id, isEdit, navigate])

  async function onSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setError('')
    try {
      setResults(await adminApi.match(query.trim()))
    } catch (err) {
      if (err.authExpired) {
        navigate('/admin/login', { state: { expired: true }, replace: true })
        return
      }
      setError(err.message)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function onPick(r) {
    setPicked(r)
    setResults(null)
  }

  function onAddProvider(e) {
    e.preventDefault()
    setAddError('')
    // Validasi ringan client-side
    if (!addUrl.trim()) {
      setAddError('Isi Video URL untuk provider self-hosted.')
      return
    }
    setProviders([
      ...providers,
      normalizeProvider({ type: 'self', label: addLabel.trim() || undefined, video_url: addUrl.trim(), video_type: addVideoType }),
    ])
    // reset state add
    setAddOpen(false)
    setAddType('self')
    setAddUrl('')
    setAddVideoType('hls')
    setAddLabel('')
    setAddError('')
  }

  async function onSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = { status, providers }

      if (isEdit) {
        await adminApi.updateEntry(id, payload)
      } else {
        const tmdbId = picked ? picked.id : Number(manualId)
        const type = picked ? picked.type : manualType
        if (!tmdbId) {
          setError('Pilih hasil pencarian TMDB atau isi TMDB ID manual.')
          setSaving(false)
          return
        }
        await adminApi.createEntry({
          type,
          tmdb_id: tmdbId,
          title: picked ? picked.title : title || undefined,
          ...payload,
        })
      }
      navigate('/admin')
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

  if (loadingEntry) return <div className="admin-page"><p className="hint">Memuat entri...</p></div>

  return (
    <div className="admin-page">
      <h1>{isEdit ? `Edit: ${title}` : 'Tambah Entri Baru'}</h1>
      {error && <p className="error-box">{error}</p>}

      {!isEdit && (
        <section className="admin-card">
          <h2>Cari di TMDB</h2>
          <form className="search-row" onSubmit={onSearch}>
            <input
              className="field"
              placeholder="Judul film atau series..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={searching}>
              {searching ? 'Mencari...' : 'Cari TMDB'}
            </button>
          </form>

          {picked && (
            <div className="picked">
              {picked.poster_path && <img src={img(picked.poster_path, 'w92')} alt="" />}
              <div>
                <strong>{picked.title}</strong> ({picked.year || '—'}) — {picked.type === 'tv' ? 'Series' : 'Film'} · TMDB #{picked.id}
                <p className="hint">{picked.overview?.slice(0, 140)}{(picked.overview || '').length > 140 ? '...' : ''}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicked(null)}>Ganti</button>
            </div>
          )}

          {results && !picked && (
            results.length === 0 ? (
              <p className="hint">Tidak ada hasil untuk "{query}". Coba judul lain atau isi manual di bawah.</p>
            ) : (
              <div className="match-grid">
                {results.map((r) => (
                  <div className="match-card" key={`${r.type}-${r.id}`}>
                    {r.poster_path ? (
                      <img src={img(r.poster_path, 'w154')} alt="" />
                    ) : (
                      <div className="match-noposter">?</div>
                    )}
                    <div className="match-info">
                      <strong>{r.title}</strong>
                      <span className="hint">{r.year || '—'} · {r.type === 'tv' ? 'Series' : 'Film'}</span>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPick(r)}>Pilih</button>
                  </div>
                ))}
              </div>
            )
          )}

          {!picked && (
            <>
              <h2 style={{ marginTop: 22 }}>Atau Isi Manual</h2>
              <div className="search-row">
                <input
                  className="field"
                  placeholder="TMDB ID (mis. 550)"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                />
                <select className="field" value={manualType} onChange={(e) => setManualType(e.target.value)}>
                  <option value="movie">Film</option>
                  <option value="tv">Series</option>
                </select>
              </div>
            </>
          )}
        </section>
      )}

      <form className="admin-card" onSubmit={onSave}>
        <h2>Video & Status</h2>
        {isEdit && (
          <p className="hint">{manualType === 'tv' ? 'Series' : 'Film'} · TMDB #{manualId}</p>
        )}

        {/* Provider Selection */}
        <h3>Video self-hosted (override judul ini)</h3>
        {providers.length === 0 && <p className="hint">Belum ada provider. Tambahkan di bawah.</p>}
        {providers.map((p, i) => (
          <div className="provider-item" key={i}>
            <span><strong>{p.label}</strong> · <em>Self-hosted</em></span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setProviders(providers.filter((_, j) => j !== i))}>Hapus</button>
          </div>
        ))}

        {!addOpen ? (
          <div className="form-row">
            <button type="button" className="btn btn-sm" onClick={() => setAddOpen(true)}>Tambah Provider</button>
          </div>
        ) : (
          <form className="provider-form" onSubmit={onAddProvider}>
            <h4>Provider Baru</h4>
            <label>
              Tipe Provider
              <select className="field" value={addType} onChange={(e) => setAddType(e.target.value)}>
                <option value="self">Self-hosted (ArtPlayer)</option>
              </select>
            </label>

            {/* Selalu self — tanam langsung */}
            <label>
              Video URL
              <input
                className="field"
                type="url"
                placeholder="https://.../playlist.m3u8"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
              />
            </label>
            <label>
              Tipe Video
              <select className="field" value={addVideoType} onChange={(e) => setAddVideoType(e.target.value)}>
                <option value="hls">HLS (.m3u8)</option>
                <option value="dash">DASH (.mpd)</option>
                <option value="embed">Embed (iframe)</option>
              </select>
            </label>

            <label>
              Label (opsional)
              <input
                className="field"
                placeholder="Self-hosted"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
              />
            </label>

            {addError && <p className="error-box">{addError}</p>}

            <div className="form-row">
              <button className="btn btn-primary btn-sm" type="submit">Tambah</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAddOpen(false); setAddError('') }}>Batal</button>
            </div>
          </form>
        )}

        <label>
          Status
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Draft (tidak tampil di situs)</option>
            <option value="published">Published (tampil di situs)</option>
          </select>
        </label>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <Link to="/admin" className="btn btn-ghost">Batal</Link>
        </div>
      </form>
    </div>
  )
}
