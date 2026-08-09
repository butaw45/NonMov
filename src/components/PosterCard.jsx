import { Link } from 'react-router-dom'
import { img } from '../lib/tmdb'
import { titleOf, yearOf, mediaTypeOf, ratingOf, cx } from '../lib/utils'
import { useWatchlist, toggleWatch } from '../lib/watchlist'
import { IconPlus, IconCheck, IconStar } from './Icons'

export default function PosterCard({ item }) {
  const type = mediaTypeOf(item)
  const title = titleOf(item)
  const poster = img(item.poster_path, 'w342')
  const rating = ratingOf(item)
  const list = useWatchlist()
  const saved = list.some((x) => x.type === type && x.id === item.id)

  return (
    <Link className="card" to={`/judul/${type}/${item.id}`}>
      <div className="card-poster">
        {poster && (
          <img
            loading="lazy"
            src={poster}
            alt={`Poster ${title}`}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const fb = e.currentTarget.nextElementSibling
              if (fb) fb.hidden = false
            }}
          />
        )}
        <div className="card-empty" hidden={Boolean(poster)}>
          <span>{title}</span>
        </div>
        <div className="card-veil">
          <button
            className={cx('chip-btn', saved && 'on')}
            title={saved ? 'Hapus dari daftar saya' : 'Simpan ke daftar saya'}
            aria-label={saved ? `Hapus ${title} dari daftar` : `Simpan ${title} ke daftar`}
            onClick={(e) => {
              e.preventDefault()
              toggleWatch(item)
            }}
          >
            {saved ? <IconCheck size={14} /> : <IconPlus size={14} />}
          </button>
        </div>
        {rating && (
          <span className="card-rate">
            <IconStar size={11} />
            {rating}
          </span>
        )}
      </div>
      <div className="card-caption">
        <span className="card-title">{title}</span>
        <span className="card-meta">
          {yearOf(item)}{type === 'tv' ? ' · Series' : ' · Film'}
        </span>
      </div>
    </Link>
  )
}
