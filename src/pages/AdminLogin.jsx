import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { adminApi } from '../lib/api'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dismissedExpired, setDismissedExpired] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const expired = location.state?.expired && !dismissedExpired

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setDismissedExpired(true)
    setLoading(true)
    try {
      await adminApi.login(username, password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-card" onSubmit={onSubmit}>
        <h1>Admin Seluloid</h1>
        <p className="hint">Masuk untuk mengelola katalog.</p>
        {expired && <p className="error-box">Sesi berakhir, silakan masuk lagi.</p>}
        {error && <p className="error-box">{error}</p>}
        <label>
          Username
          <input
            className="field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>
        <label>
          Password
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Memeriksa...' : 'Masuk'}
        </button>
      </form>
    </div>
  )
}
