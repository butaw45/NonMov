import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { IconBookmark, IconSearch } from './Icons'
import { cx } from '../lib/utils'

// TopBar solid — tidak ada scroll observer, selalu solid di atas.
export default function TopBar() {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const { pathname, search } = useLocation()
  const tipe = new URLSearchParams(search).get('tipe')

  const submit = (e) => {
    e.preventDefault()
    const s = q.trim()
    if (s) nav(`/cari?q=${encodeURIComponent(s)}`)
  }

  const linkCls = (active) => cx(active && 'active')

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" aria-label="Beranda LAYAR" className="topbar-brand">
          <Logo />
        </Link>
        <nav className="topbar-links" aria-label="Navigasi utama">
          <Link to="/" className={linkCls(pathname === '/')}>Beranda</Link>
          <Link to="/jelajah?tipe=movie" className={linkCls(pathname === '/jelajah' && tipe === 'movie')}>Film</Link>
          <Link to="/jelajah?tipe=tv" className={linkCls(pathname === '/jelajah' && tipe === 'tv')}>Series</Link>
        </nav>
        <form className="topbar-search" onSubmit={submit} role="search">
          <IconSearch size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari..." aria-label="Cari" />
        </form>
        <Link to="/watchlist" className={cx('topbar-action', pathname === '/watchlist' && 'active')}>
          <IconBookmark size={18} />
          <span>Daftar Saya</span>
        </Link>
      </div>
    </header>
  )
}