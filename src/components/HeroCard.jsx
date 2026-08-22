import { img } from '../lib/tmdb'
import { titleOf, yearOf, mediaTypeOf, ratingOf } from '../lib/utils'
import { IconPlay, IconPlus, IconCheck, IconStar } from './Icons'
import Kicker from './Kicker'

// Presentasional murni — tidak ada useWatchlist, toggleWatch, atau Link internal.
export default function HeroCard({ item, onWatch, onToggle, saved }) {
  const type = mediaTypeOf(item)
  const title = titleOf(item)
  const rating = ratingOf(item)
  const backdrop = img(item.backdrop_path, 'w1280')

  return (
    <section className="hero">
      {backdrop && (
        <div className="hero-bg">
          <img src={backdrop} alt="" />
        </div>
      )}
      <div className="hero-content">
        <Kicker no={item.id} label="ARSIP MINGGU INI" />
        <h1 className="hero-title">{title}</h1>
        <div className="hero-meta">
          {rating && <span className="star"><IconStar size={15} />{rating}</span>}
          <span>{yearOf(item)}</span>
          <span>{type === 'tv' ? 'Series' : 'Film'}</span>
        </div>
        <p className="hero-overview">{item.overview || 'Sinopsis belum tersedia.'}</p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={onWatch}>
            <IconPlay size={16} /> Tonton
          </button>
          <button className="btn btn-ghost" onClick={onToggle}>
            {saved ? <IconCheck size={16} /> : <IconPlus size={16} />}
            {saved ? 'Tersimpan' : 'Simpan'}
          </button>
        </div>
      </div>
    </section>
  )
}