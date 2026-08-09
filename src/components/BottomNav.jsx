import { Link, useLocation } from 'react-router-dom'
import { IconHome, IconFilm, IconTv, IconSearch, IconBookmark } from './Icons'

// Navigasi bawah untuk layar kecil — ala aplikasi native, bukan menu hamburger.
export default function BottomNav() {
  const { pathname, search } = useLocation()
  const tipe = new URLSearchParams(search).get('tipe')

  const items = [
    { to: '/', label: 'Beranda', icon: IconHome, active: pathname === '/' },
    { to: '/jelajah?tipe=movie', label: 'Film', icon: IconFilm, active: pathname === '/jelajah' && (tipe === 'movie' || !tipe) },
    { to: '/jelajah?tipe=tv', label: 'Series', icon: IconTv, active: pathname === '/jelajah' && tipe === 'tv' },
    { to: '/cari', label: 'Cari', icon: IconSearch, active: pathname === '/cari' },
    { to: '/watchlist', label: 'Daftar', icon: IconBookmark, active: pathname === '/watchlist' },
  ]

  return (
    <nav className="bottomnav" aria-label="Navigasi bawah">
      {items.map(({ to, label, icon: Icon, active }) => (
        <Link key={label} to={to} className={active ? 'active' : ''}>
          <Icon size={21} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
