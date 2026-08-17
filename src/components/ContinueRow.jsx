import { Link } from 'react-router-dom'
import { img } from '../lib/tmdb'
import { useHistory, removeHistory } from '../lib/history'
import { IconX } from './Icons'

// Baris "Lanjutkan Menonton" (PRD P2#1): kartu poster + progress bar + label
// episode. Klik kartu menuju player (TV membawa season/episode di query),
// tombol X menghapus entri. Hilang otomatis saat riwayat kosong.
export default function ContinueRow() {
  const entries = useHistory()
  if (entries.length === 0) return null

  return (
    <section className="row">
      <div className="row-head">
        <span className="kicker">Lanjutkan dari terakhir kali</span>
        <h2>Lanjutkan Menonton</h2>
      </div>
      <div className="continue-track">
        {entries.map((e) => {
          const to =
            e.type === 'tv'
              ? `/tonton/tv/${e.id}?season=${e.season}&episode=${e.episode}`
              : `/tonton/movie/${e.id}`
          const pct = e.dur > 0 ? Math.min(100, (e.pos / e.dur) * 100) : 0
          return (
            <div className="continue-card" key={`${e.type}:${e.id}`}>
              <Link className="continue-link" to={to}>
                {e.poster_path && (
                  <img loading="lazy" src={img(e.poster_path, 'w342')} alt="" />
                )}
                <div className="continue-meta">
                  <span className="continue-title">{e.title}</span>
                  {e.type === 'tv' && e.season != null && (
                    <span className="continue-ep">
                      S{e.season}E{e.episode}
                    </span>
                  )}
                </div>
                <div className="continue-progress">
                  <span style={{ width: `${pct}%` }} />
                </div>
              </Link>
              <button
                className="continue-remove"
                aria-label={`Hapus ${e.title} dari Lanjutkan Menonton`}
                onClick={() => removeHistory(e.type, e.id)}
              >
                <IconX size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
