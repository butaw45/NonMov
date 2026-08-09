import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { IconBookmark, IconSearch } from './Icons'
import { cx } from '../lib/utils'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const { pathname, search } = useLocation()
  const tipe = new URLSearchParams(search).get('tipe')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Pintasan keyboard: tekan "/" langsung fokus ke kolom cari
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        e.preventDefault()
        document.getElementById('nav-search')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = (e) => {
    e.preventDefault()
    const s = q.trim()
    if (s) nav(`/cari?q=${encodeURIComponent(s)}`)
  }

  const linkCls = (active) => cx(active && 'active')

  return (
    <header className={cx('nav', (scrolled || pathname !== '/') && 'nav-solid')}>
      <div className="nav-inner">
        <Link to="/" aria-label="Beranda Seluloid" className="nav-brand">
          <Logo />
        </Link>
        <nav className="nav-links" aria-label="Navigasi utama">
          <Link to="/" className={linkCls(pathname === '/')}>Beranda</Link>
          <Link to="/jelajah?tipe=movie" className={linkCls(pathname === '/jelajah' && tipe === 'movie')}>Film</Link>
          <Link to="/jelajah?tipe=tv" className={linkCls(pathname === '/jelajah' && tipe === 'tv')}>Series</Link>
        </nav>
        <form className="nav-search" onSubmit={submit} role="search">
          <IconSearch size={16} />
          <input
            id="nav-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari film, series…  ( / )"
            aria-label="Cari film atau series"
          />
        </form>
        <Link to="/watchlist" className={cx('nav-list', pathname === '/watchlist' && 'active')}>
          <IconBookmark size={18} />
          <span className="nav-list-label">Daftar Saya</span>
        </Link>
      </div>
    </header>
  )
}
