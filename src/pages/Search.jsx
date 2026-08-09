import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { tmdb } from '../lib/tmdb'
import { useTitle, useDebounce } from '../lib/hooks'
import { recentSearches, pushRecentSearch } from '../lib/watchlist'
import PosterCard from '../components/PosterCard'
import { GridSkeleton } from '../components/Skeletons'
import { IconSearch, IconX, IconAlert } from '../components/Icons'

export default function Search() {
  const [sp, setSp] = useSearchParams()
  const fromUrl = sp.get('q') || ''
  const [q, setQ] = useState(fromUrl)
  const dq = useDebounce(q, 450)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [recent, setRecent] = useState(recentSearches())

  useTitle(q.trim() ? `Cari: ${q.trim()}` : 'Cari')

  // Sinkron saat datang dari navbar dengan ?q=...
  useEffect(() => { setQ(fromUrl) }, [fromUrl])

  useEffect(() => {
    const s = dq.trim()
    if (!s) {
      setResults(null)
      setError(null)
      const next = new URLSearchParams(sp)
      next.delete('q')
      setSp(next, { replace: true })
      return
    }
    const next = new URLSearchParams(sp)
    next.set('q', s)
    setSp(next, { replace: true })

    let on = true
    setLoading(true)
    setError(null)
    tmdb.searchMulti(s)
      .then((d) => {
        if (!on) return
        setResults(d.results || [])
        setLoading(false)
        pushRecentSearch(s)
        setRecent(recentSearches())
      })
      .catch((e) => {
        if (!on) return
        setError(e.message)
        setLoading(false)
      })
    return () => { on = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq])

  const movies = (results || []).filter((r) => r.media_type === 'movie' && r.poster_path)
  const series = (results || []).filter((r) => r.media_type === 'tv' && r.poster_path)

  return (
    <div className="container page-pad">
      <div className="page-head">
        <span className="kicker">Arsip</span>
        <h1>Cari Judul</h1>
      </div>

      <div className="search-hero">
        <div className="search-input">
          <IconSearch size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ketik judul film atau series…"
            autoFocus
            aria-label="Kata kunci pencarian"
          />
          {q && (
            <button className="clear" onClick={() => setQ('')} aria-label="Bersihkan pencarian">
              <IconX size={16} />
            </button>
          )}
        </div>

        {!q.trim() && recent.length > 0 && (
          <div className="recent">
            <span className="lbl">Terakhir dicari</span>
            {recent.map((r) => (
              <button key={r} onClick={() => setQ(r)}>{r}</button>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <div className="state">
          <IconAlert size={40} />
          <h3>Pencarian terganggu.</h3>
          <p>{error}</p>
        </div>
      ) : loading ? (
        <GridSkeleton cards={10} />
      ) : results === null ? (
        <p className="muted">Mulai ketik untuk mencari di seluruh katalog film &amp; series.</p>
      ) : movies.length === 0 && series.length === 0 ? (
        <div className="state">
          <IconSearch size={40} />
          <h3>Tidak ketemu.</h3>
          <p>Tidak ada hasil untuk “{q.trim()}”. Coba ejaan lain atau kata yang lebih umum.</p>
        </div>
      ) : (
        <>
          {movies.length > 0 && (
            <section className="search-section">
              <h2>Film ({movies.length})</h2>
              <div className="grid">
                {movies.map((m) => (
                  <PosterCard item={m} key={`movie:${m.id}`} />
                ))}
              </div>
            </section>
          )}
          {series.length > 0 && (
            <section className="search-section">
              <h2>Series ({series.length})</h2>
              <div className="grid">
                {series.map((s) => (
                  <PosterCard item={s} key={`tv:${s.id}`} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
