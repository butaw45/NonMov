import { useRef } from 'react'
import PosterCard from './PosterCard'
import { keyOf } from '../lib/utils'
import { IconChevronL, IconChevronR } from './Icons'

// Baris katalog horizontal ala rak bioskop: judul + garis, geser dengan panah.
export default function Row({ kicker, title, items, numbered = false }) {
  const track = useRef(null)

  if (!items || items.length === 0) return null

  const slide = (dir) => {
    track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <section className="row">
      <div className="row-head">
        {kicker && <span className="kicker">{kicker}</span>}
        <h2>{title}</h2>
      </div>
      <div className="row-body">
        <button className="row-arrow left" onClick={() => slide(-1)} aria-label="Geser ke kiri">
          <IconChevronL size={22} />
        </button>
        <div className="row-track" ref={track}>
          {items.map((it, i) =>
            numbered ? (
              <div className="rank" key={keyOf(it)}>
                <span className="rank-num" aria-hidden="true">{i + 1}</span>
                <PosterCard item={it} />
              </div>
            ) : (
              <PosterCard item={it} key={keyOf(it)} />
            )
          )}
        </div>
        <button className="row-arrow right" onClick={() => slide(1)} aria-label="Geser ke kanan">
          <IconChevronR size={22} />
        </button>
      </div>
    </section>
  )
}
