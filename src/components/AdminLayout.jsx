import { useEffect, useState } from 'react'
import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { adminApi } from '../lib/api'

// AdminLayout = proteksi sesi + shell admin (header + nav + <Outlet/>).
// Dipasang sebagai parent route /admin di App.jsx.
export default function AdminLayout() {
  const [state, setState] = useState('checking') // checking | ok
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    adminApi
      .me()
      .then(() => !cancelled && setState('ok'))
      .catch(() => {
        if (!cancelled) setState('expired')
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  async function onLogout() {
    try {
      await adminApi.logout()
    } catch {
      // abaikan — cookie toh akan dihapus / sudah expired
    }
    navigate('/admin/login', { replace: true })
  }

  if (state === 'checking') {
    return (
      <div className="admin-shell">
        <p className="hint" style={{ padding: 40, textAlign: 'center' }}>Memeriksa sesi...</p>
      </div>
    )
  }
  if (state === 'expired') {
    return <Navigate to="/admin/login" state={{ expired: true }} replace />
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link to="/admin" className="admin-brand">Seluloid Admin</Link>
        <nav>
          <Link to="/" className="btn btn-ghost btn-sm">Lihat Situs</Link>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Keluar</button>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
