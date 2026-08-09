import { Link } from 'react-router-dom'
import { useWatchlist, clearWatchlist } from '../lib/watchlist'
import { useTitle } from '../lib/hooks'
import { keyOf } from '../lib/utils'
import PosterCard from '../components/PosterCard'
import { IconBookmark, IconCompass } from '../components/Icons'

export default function Watchlist() {
  useTitle('Daftar Saya')
  const list = useWatchlist()

  // Bentuk entri simpanan disamakan dengan bentuk item TMDB supaya PosterCard langsung pakai.
  const items = list.map((x) => ({
    id: x.id,
    media_type: x.type,
    title: x.title,
    poster_path: x.poster_path,
    vote_average: x.vote_average,
    release_date: x.year ? `${x.year}-01-01` : '',
  }))

  return (
    <div className="container page-pad">
      <div className="page-head">
        <span className="kicker">Tersimpan lokal di browser ini</span>
        <h1>Daftar Saya</h1>
      </div>

      {list.length === 0 ? (
        <div className="state">
          <IconBookmark size={40} />
          <h3>Daftarmu masih kosong.</h3>
          <p>
            Tandai film atau series lewat tombol simpan di kartu mana pun — semuanya akan
            terkumpul di sini, tanpa perlu buat akun.
          </p>
          <Link className="btn btn-primary" to="/jelajah">
            <IconCompass size={16} />
            Mulai Jelajah
          </Link>
        </div>
      ) : (
        <>
          <div className="wl-actions">
            <span className="wl-count">{list.length} judul tersimpan</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (window.confirm('Kosongkan seluruh daftar simpan?')) clearWatchlist()
              }}
            >
              Kosongkan
            </button>
          </div>
          <div className="grid">
            {items.map((it) => (
              <PosterCard item={it} key={keyOf(it)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
