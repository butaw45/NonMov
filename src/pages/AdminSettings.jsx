import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../lib/api'

export default function AdminSettings() {
  const navigate = useNavigate()

  const [vidukiEnabled, setVidukiEnabled] = useState(true)
  const [vidukiDefaultApi, setVidukiDefaultApi] = useState(2)
  const [vidukiColor, setVidukiColor] = useState('#ef4444')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    adminApi
      .getConfig()
      .then((c) => {
        setVidukiEnabled(c.viduki_enabled ?? true)
        setVidukiDefaultApi(c.viduki_default_api ?? 2)
        setVidukiColor(c.viduki_color ?? '#ef4444')
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

  async function onSave(e) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      await adminApi.updateConfig({
        viduki_enabled: vidukiEnabled,
        viduki_default_api: Number(vidukiDefaultApi),
        viduki_color: vidukiColor,
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
        <label>
          <input
            type="checkbox"
            checked={vidukiEnabled}
            onChange={(e) => setVidukiEnabled(e.target.checked)}
          />{' '}
          Aktifkan viduki.net (auto-fallback)
        </label>

        <label>
          API Default
          <select
            className="field"
            value={vidukiDefaultApi}
            onChange={(e) => setVidukiDefaultApi(Number(e.target.value))}
          >
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
            value={vidukiColor}
            onChange={(e) => setVidukiColor(e.target.value)}
          />
        </label>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  )
}
