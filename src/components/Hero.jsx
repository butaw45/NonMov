import { Link } from 'react-router-dom'
import { img } from '../lib/tmdb'
import { titleOf, yearOf, mediaTypeOf, ratingOf, cx } from '../lib/utils'
import { useWatchlist, toggleWatch } from '../lib/watchlist'
import { IconPlay, IconPlus, IconCheck, IconStar } from './Icons'

// Pembuka beranda: satu judul sorotan dengan latar yang "bernapas" pelan.
export default function Hero({ item }) {
  const type = mediaTypeOf(item)
  const title = titleOf(item)
  const rating = ratingOf(item)
  const list = useWatchlist()
  const saved = list.some((x) => x.type === type && x.id === item.id)
  const backdrop = img(item.backdrop_path, 'w1280')

  return (
    <section className="hero">
      {backdrop && (
        <div className="hero-bg">
          <img src={backdrop} alt="" />
        </div>
      )}
      <div className="hero-content">
        <span className="kicker">Sedang ramai minggu ini</span>
        <h1 className="hero-title">{title}</h1>
        <div className="hero-meta">
          {rating && (
            <span className="star">
              <IconStar size={15} />
              {rating}
            </span>
          )}
          <span>{yearOf(item)}</span>
          <span>{type === 'tv' ? 'Series' : 'Film'}</span>
        </div>
        <p className="hero-overview">
          {item.overview || 'Sinopsis belum tersedia dalam Bahasa Indonesia.'}
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to={`/judul/${type}/${item.id}`}>
            <IconPlay size={16} />
            Lihat Detail
          </Link>
          <button
            className={cx('btn btn-ghost', saved && 'on')}
            onClick={() => toggleWatch(item)}
          >
            {saved ? <IconCheck size={16} /> : <IconPlus size={16} />}
            {saved ? 'Tersimpan' : 'Simpan'}
          </button>
        </div>
      </div>
    </section>
  )
}
