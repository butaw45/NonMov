import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { tmdb } from '../lib/tmdb'
import { useTitle } from '../lib/hooks'
import { cx, keyOf } from '../lib/utils'
import { COUNTRIES, DEBOUNCE_MS, ratingParam } from '../lib/browseFilters'
import PosterCard from '../components/PosterCard'
import { GridSkeleton } from '../components/Skeletons'
import { IconAlert, IconCompass } from '../components/Icons'

const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: THIS_YEAR - 1959 }, (_, i) => THIS_YEAR - i)

// Jelajah = discover/filter (PRD P1: filter genre, tahun, rating)
export default function Browse() {
  const [sp, setSp] = useSearchParams()
  const tipe = sp.get('tipe') === 'tv' ? 'tv' : 'movie'
  const genre = sp.get('genre') || ''
  const tahun = sp.get('tahun') || ''
  const rating = sp.get('rating') || ''
  const [draftRating, setDraftRating] = useState(rating)
  // spRef: selalu merefleksikan sp terbaru — cegah stale closure di timeout debounce
  const spRef = useRef(sp)
  spRef.current = sp
  const urut = sp.get('urut') || 'populer'
  const negara = sp.get('negara') || ''

  useTitle(tipe === 'tv' ? 'Jelajah Series' : 'Jelajah Film')

  const [genres, setGenres] = useState([])
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const setParam = (key, value, resetGenre = false) => {
    const next = new URLSearchParams(sp)
    if (resetGenre) next.delete('genre')
    if (value) next.set(key, value)
    else next.delete(key)
    setSp(next)
  }

  // Debounce: draftRating local state → URL rating (300ms) untuk cegah spam API saat drag slider
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(spRef.current)
      if (draftRating && draftRating !== '0') next.set('rating', draftRating)
      else next.delete('rating')
      setSp(next, { replace: true })
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftRating])
  useEffect(() => {
    let on = true
    tmdb.genres(tipe)
      .then((d) => { if (on) setGenres(d.genres || []) })
      .catch(() => {})
    return () => { on = false }
  }, [tipe])

  const buildParams = (p) => {
    const out = { page: p }
    out.sort_by =
      urut === 'rating' ? 'vote_average.desc'
      : urut === 'baru' ? (tipe === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc')
      : 'popularity.desc'
    if (genre) out.with_genres = genre
    if (tahun) out[tipe === 'movie' ? 'primary_release_year' : 'first_air_date_year'] = tahun
    if (urut === 'rating') out['vote_count.gte'] = '200'
    // Rating filter — passing existing vote_count.gte untuk Math.max anti-collision
    const rp = ratingParam(rating, Number(out['vote_count.gte']))
    if (rp) {
      out['vote_average.gte'] = String(rp.gte)
      out['vote_count.gte'] = String(rp.countGte)
    }
    // Negara filter
    if (negara) out.with_origin_country = negara
    return out
  }

  useEffect(() => {
    let on = true
    setLoading(true)
    setError(null)
    setItems([])
    setPage(1)
    tmdb.discover(tipe, buildParams(1))
      .then((d) => {
        if (!on) return
        setItems((d.results || []).filter((x) => x.poster_path))
        setTotalPages(Math.min(d.total_pages || 1, 500))
        setLoading(false)
      })
      .catch((e) => {
        if (!on) return
        setError(e.message)
        setLoading(false)
      })
    return () => { on = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipe, genre, tahun, urut, rating, negara])

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return
    setLoadingMore(true)
    const next = page + 1
    tmdb.discover(tipe, buildParams(next))
      .then((d) => {
        setItems((xs) => [...xs, ...(d.results || []).filter((x) => x.poster_path)])
        setPage(next)
        setLoadingMore(false)
      })
      .catch(() => setLoadingMore(false))
  }

  return (
    <div className="container page-pad">
      <div className="page-head">
        <span className="kicker">Katalog</span>
        <h1>Jelajah</h1>
      </div>

      <div className="browse-bar">
        <div className="tabs" role="tablist" aria-label="Tipe konten">
          <button className={cx(tipe === 'movie' && 'on')} onClick={() => setParam('tipe', 'movie', true)}>
            Film
          </button>
          <button className={cx(tipe === 'tv' && 'on')} onClick={() => setParam('tipe', 'tv', true)}>
            Series
          </button>
        </div>
        <div className="spacer" />
        <label>
          Tahun
          <select className="field" value={tahun} onChange={(e) => setParam('tahun', e.target.value)}>
            <option value="">Semua</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          Urutkan
          <select className="field" value={urut} onChange={(e) => setParam('urut', e.target.value)}>
            <option value="populer">Popularitas</option>
            <option value="rating">Rating tertinggi</option>
            <option value="baru">Terbaru</option>
          </select>
        </label>
        <label className="filter-rating">
          Minimal rating{draftRating && Number(draftRating) > 0 ? ` : ${draftRating}+` : ''}
          <input
            type="range" min="0" max="10" step="0.5"
            className="field-range"
            value={draftRating || 0}
            onChange={(e) => setDraftRating(e.target.value)}
            onMouseUp={() => {
              const next = new URLSearchParams(sp)
              if (draftRating && draftRating !== '0') next.set('rating', draftRating)
              else next.delete('rating')
              setSp(next, { replace: true })
            }}
            onTouchEnd={() => {
              const next = new URLSearchParams(sp)
              if (draftRating && draftRating !== '0') next.set('rating', draftRating)
              else next.delete('rating')
              setSp(next, { replace: true })
            }}
            aria-label="Rating minimum"
            aria-valuenow={Number(draftRating || 0)}
            aria-valuemin={0}
            aria-valuemax={10}
          />
        </label>
        <label>
          Negara
          <select className="field" value={negara} onChange={(e) => setParam('negara', e.target.value)}>
            <option value="">Semua negara</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
        {(rating || negara || genre || tahun || urut !== 'populer') && (
          <button
            className="btn-reset"
            onClick={() => { setSp(new URLSearchParams()); setDraftRating('') }}
          >
            Setel ulang
          </button>
        )}
      </div>

      {genres.length > 0 && (
        <div className="genre-chips">
          <button className={cx('genre-chip', !genre && 'on')} onClick={() => setParam('genre', '')}>
            Semua genre
          </button>
          {genres.map((g) => (
            <button
              key={g.id}
              className={cx('genre-chip', genre === String(g.id) && 'on')}
              onClick={() => setParam('genre', String(g.id))}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <div className="state">
          <IconAlert size={40} />
          <h3>Katalog gagal dimuat.</h3>
          <p>{error}</p>
        </div>
      ) : loading ? (
        <GridSkeleton />
      ) : items.length === 0 ? (
        <div className="state">
          <IconCompass size={40} />
          <h3>Tidak ada yang cocok.</h3>
          <p>Coba ganti kombinasi genre atau tahunnya — arsipnya luas.</p>
        </div>
      ) : (
        <>
          <div className="grid">
            {items.map((it) => (
              <PosterCard item={it} key={keyOf(it)} />
            ))}
          </div>
          <div className="load-more">
            {page < totalPages ? (
              <button className="btn btn-ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Memuat…' : 'Muat Lebih Banyak'}
              </button>
            ) : (
              <span className="count-note">Akhir katalog — {items.length} judul ditampilkan.</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
