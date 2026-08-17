import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../lib/api'
import { PROVIDER_TYPES } from '../lib/providers'

export default function AdminSettings() {
  const navigate = useNavigate()

  // Pool provider global (config.json → providers[]). id dibuat server.
  const [providers, setProviders] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // State sementara untuk form "Tambah Provider"
  const [addType, setAddType] = useState('viduki')
  const [addLabel, setAddLabel] = useState('')
  const [addVidukiApi, setAddVidukiApi] = useState(2)
  const [addVidukiColor, setAddVidukiColor] = useState('#ef4444')
  const [addMediaType, setAddMediaType] = useState('') // '' = null (keduanya)

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
    const p = {
      type: addType,
      label: addLabel.trim() || PROVIDER_TYPES[addType].label,
      viduki_api: addType === 'viduki' ? Number(addVidukiApi) : undefined,
      viduki_color: addType === 'viduki' ? addVidukiColor : undefined,
      media_type: addMediaType === '' ? null : addMediaType,
      enabled: true,
    }
    setProviders([...providers, p])
    // reset form
    setAddLabel('')
    setAddMediaType('')
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
      // Kirim shape lengkap; id dibuang — server yang bikin saat simpan.
      await adminApi.updateConfig({
        providers: providers.map(({ id, ...p }) => p),
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
              <strong>{p.label}</strong> · <em>{PROVIDER_TYPES[p.type].label}</em>
              <span className="badge">{mediaTypeLabel(p.media_type)}</span>
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
          Tipe Provider
          <select className="field" value={addType} onChange={(e) => setAddType(e.target.value)}>
            {Object.entries(PROVIDER_TYPES).map(([key, spec]) => (
              <option key={key} value={key}>{spec.label}</option>
            ))}
          </select>
        </label>

        <label>
          Label
          <input
            className="field"
            type="text"
            value={addLabel}
            placeholder={PROVIDER_TYPES[addType].label}
            onChange={(e) => setAddLabel(e.target.value)}
          />
        </label>

        {addType === 'viduki' && (
          <>
            <label>
              API viduki
              <select className="field" value={addVidukiApi} onChange={(e) => setAddVidukiApi(Number(e.target.value))}>
                <option value="1">API 1 — Multi Server</option>
                <option value="2">API 2 — Multi Language</option>
                <option value="3">API 3 — Multi Embeds</option>
                <option value="4">API 4 — Premium Embeds</option>
              </select>
            </label>
            <label>
              Warna Player
              <input
                className="field"
                type="color"
                value={addVidukiColor}
                onChange={(e) => setAddVidukiColor(e.target.value)}
              />
            </label>
          </>
        )}

        <label>
          Media Type
          <select className="field" value={addMediaType} onChange={(e) => setAddMediaType(e.target.value)}>
            <option value="">Movie + TV (semua)</option>
            <option value="movie">Movie</option>
            <option value="tv">TV</option>
          </select>
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
