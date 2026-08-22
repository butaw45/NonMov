import { useRef } from 'react'
import PosterCard from './PosterCard'
import { keyOf, mediaTypeOf } from '../lib/utils'
import { useWatchlist, toggleWatch } from '../lib/watchlist'

const VISIBLE = 6

// Baris katalog horizontal: nomor urut di kicker, strip navigasi [01] [02].
export default function Row({ kicker, title, items, numbered = false }) {
  const track = useRef(null)
  const list = useWatchlist()

  if (!items || items.length === 0) return null

  const pages = Math.ceil(items.length / VISIBLE)

  const slideTo = (page) => {
    track.current?.scrollTo({ left: page * track.current.clientWidth, behavior: 'smooth' })
  }

  const isSaved = (it) => list.some((x) => x.type === mediaTypeOf(it) && x.id === it.id)

  return (
    <section className="row">
      <div className="row-head">
        {kicker && <span className="kicker">{kicker}</span>}
        <h2>{title}</h2>
      </div>
      <div className="row-body">
        <div className="row-track" ref={track}>
          {items.map((it, i) =>
            numbered ? (
              <div className="rank" key={keyOf(it)}>
                <span className="rank-num" aria-hidden="true">{i + 1}</span>
                <PosterCard item={it} saved={isSaved(it)} onToggle={toggleWatch} />
              </div>
            ) : (
              <PosterCard item={it} key={keyOf(it)} saved={isSaved(it)} onToggle={toggleWatch} />
            )
          )}
        </div>
        {pages > 1 && (
          <div className="row-strip" aria-label="Navigasi arsip">
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} className="row-strip-num" onClick={() => slideTo(i)}>
                [{String(i + 1).padStart(2, '0')}]
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}