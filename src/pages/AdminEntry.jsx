import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { adminApi } from '../lib/api'
import { img } from '../lib/tmdb'

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
  const [videoUrl, setVideoUrl] = useState('')
  const [videoType, setVideoType] = useState('hls')
  const [status, setStatus] = useState('draft')
  const [title, setTitle] = useState('')

  // Provider viduki
  const [videoProvider, setVideoProvider] = useState('self') // 'self' | 'viduki'
  const [vidukiApi, setVidukiApi] = useState(2)
  const [vidukiType, setVidukiType] = useState('movie')
  const [vidukiColor, setVidukiColor] = useState('#ef4444')
  const [showPreview, setShowPreview] = useState(false)

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
        setVideoUrl(e.video_url || '')
        setVideoType(e.video_type || 'hls')
        setStatus(e.status || 'draft')
        // viduki fields
        setVideoProvider(e.video_provider || 'self')
        setVidukiApi(e.viduki_api || 2)
        setVidukiType(e.viduki_type || e.type || 'movie')
        setVidukiColor(e.viduki_color || '#ef4444')
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

  async function onSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        status,
        video_provider: videoProvider,
      }

      if (videoProvider === 'viduki') {
        payload.viduki_api = vidukiApi
        payload.viduki_type = vidukiType
        payload.viduki_color = vidukiColor
        // self fields di-clear
        payload.video_url = null
        payload.video_type = null
      } else {
        payload.video_url = videoUrl || null
        payload.video_type = videoUrl ? videoType : null
        // viduki fields di-clear
        payload.viduki_api = null
        payload.viduki_type = null
        payload.viduki_color = null
      }

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
        <label>
          Sumber Video
          <select
            className="field"
            value={videoProvider}
            onChange={(e) => setVideoProvider(e.target.value)}
          >
            <option value="self">Self-hosted (ArtPlayer)</option>
            <option value="viduki">viduki.net (Embed)</option>
          </select>
        </label>

        {videoProvider === 'self' && (
          <>
            <label>
              Video URL (opsional untuk series)
              <input
                className="field"
                type="url"
                placeholder="https://.../playlist.m3u8"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </label>
            {videoUrl && (
              <label>
                Tipe Video
                <select className="field" value={videoType} onChange={(e) => setVideoType(e.target.value)}>
                  <option value="hls">HLS (.m3u8)</option>
                  <option value="dash">DASH (.mpd)</option>
                  <option value="embed">Embed (iframe)</option>
                </select>
              </label>
            )}
          </>
        )}

        {videoProvider === 'viduki' && (
          <>
            <label>
              API viduki
              <select
                className="field"
                value={vidukiApi}
                onChange={(e) => setVidukiApi(Number(e.target.value))}
              >
                <option value="1">API 1 — Multi Server</option>
                <option value="2">API 2 — Multi Language</option>
                <option value="3">API 3 — Multi Embeds</option>
                <option value="4">API 4 — Premium Embeds</option>
              </select>
            </label>

            <label>
              Tipe viduki
              <select
                className="field"
                value={vidukiType}
                onChange={(e) => setVidukiType(e.target.value)}
              >
                <option value="movie">Movie</option>
                <option value="tv">TV Series</option>
              </select>
            </label>

            <label>
              Warna Player (opsional)
              <input
                className="field"
                type="color"
                value={vidukiColor}
                onChange={(e) => setVidukiColor(e.target.value)}
              />
            </label>

            {/* Preview iframe */}
            <div className="form-row">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Sembunyikan' : 'Tampilkan'} Preview
              </button>
            </div>
            {showPreview && manualId && (
              <div className="preview-box">
                <p className="hint">
                  Preview: https://viduki.net/{vidukiApi}/{vidukiType}/{manualId}
                  {vidukiType === 'tv' && '/1/1'}
                  ?color={encodeURIComponent(vidukiColor)}
                </p>
                <iframe
                  src={`https://viduki.net/${vidukiApi}/${vidukiType}/${manualId}${vidukiType === 'tv' ? '/1/1' : ''}?color=${encodeURIComponent(vidukiColor)}`}
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    border: 0,
                    backgroundColor: '#000',
                  }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  title="Preview viduki"
                />
              </div>
            )}
          </>
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
