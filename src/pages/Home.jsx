import { useEffect, useState } from 'react'
import { tmdb } from '../lib/tmdb'
import { useWatchlist } from '../lib/watchlist'
import { useHistory } from '../lib/history'
import { useTitle } from '../lib/hooks'
import { collectSeeds, scoreRecommendations } from '../lib/recommend'
import Hero from '../components/Hero'
import Row from '../components/Row'
import ContinueRow from '../components/ContinueRow'
import { HeroSkeleton, RowSkeleton } from '../components/Skeletons'
import { IconAlert } from '../components/Icons'

const ok = (r) => (r.status === 'fulfilled' ? r.value : null)

export default function Home() {
  useTitle()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [picks, setPicks] = useState(null)
  const [picksLoading, setPicksLoading] = useState(false)
  const watchlist = useWatchlist()
  const history = useHistory()

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [trendW, trendD, movPop, tvPop, movTop, tvTop, horor] = await Promise.allSettled([
        tmdb.trending('week'),
        tmdb.trending('day'),
        tmdb.moviePopular(),
        tmdb.tvPopular(),
        tmdb.movieTopRated(),
        tmdb.tvTopRated(),
        tmdb.discover('movie', { with_genres: 27, sort_by: 'popularity.desc' }),
      ])
      if (!alive) return
      const next = {
        trendW: ok(trendW)?.results || null,
        top10: ok(trendD)?.results?.slice(0, 10) || null,
        movPop: ok(movPop)?.results || null,
        tvPop: ok(tvPop)?.results || null,
        movTop: ok(movTop)?.results || null,
        tvTop: ok(tvTop)?.results || null,
        horor: ok(horor)?.results || null,
      }
      if (Object.values(next).every((v) => v === null)) {
        setError(
          trendW.reason?.message ||
            'Tidak bisa menghubungi TMDB. Periksa koneksi internet dan API key kamu.'
        )
        return
      }
      setRows(next)
    })()
    return () => {
      alive = false
    }
  }, [])


  // Rekomendasi personalisasi multi-seed: gabungan watchlist + history
  useEffect(() => {
    const seeds = collectSeeds(watchlist, history, 3)
    if (!seeds.length) { setPicks(null); setPicksLoading(false); return }
    setPicksLoading(true)
    let alive = true
    const exclude = new Set([
      ...watchlist.map((x) => `${x.type}:${x.id}`),
      ...history.map((x) => `${x.type}:${x.id}`),
    ])
    Promise.allSettled(seeds.map((s) => tmdb.recommendations(s.type, s.id)))
      .then(async (settled) => {
        if (!alive) return
        const seedResults = settled
          .map((r, i) => (r.status === 'fulfilled' ? { seed: seeds[i], results: r.value?.results } : null))
          .filter(Boolean)
        let items = scoreRecommendations(seedResults, exclude, 20)
        // Fallback: jika hasil kosong/gagal semua, pakai trending
        if (!items.length) {
          const trendRes = await tmdb.trending('week').catch(() => null)
          if (trendRes?.results?.length) {
            items = trendRes.results.filter((x) => x.poster_path).slice(0, 20)
          }
        }
        if (alive) { setPicks(items.length ? items : null); setPicksLoading(false) }
      })
    return () => { alive = false; setPicksLoading(false) }
  }, [watchlist, history])

  if (error) {
    return (
      <div className="err-wrap">
        <div className="state">
          <IconAlert size={40} />
          <h3>Katalog belum bisa dimuat.</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  if (!rows) {
    return (
      <>
        <HeroSkeleton />
        <div className="container rows">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      </>
    )
  }

  const featured =
    rows.trendW?.find((x) => x.backdrop_path && x.overview) || rows.trendW?.[0] || null
  const clean = (xs) => xs?.filter((x) => x.poster_path) || []

  return (
    <>
      {featured && <Hero item={featured} />}
      <div className="container rows">
        <ContinueRow />
        <Row kicker="Lintas tipe" title="Trending Minggu Ini" items={clean(rows.trendW)} />
        <Row kicker="Pilihan penonton" title="Top 10 Hari Ini" items={clean(rows.top10)} numbered />
        {picksLoading && <RowSkeleton />}
        {picks && !picksLoading && <Row kicker="Dipersonalisasi" title="Rekomendasi untukmu" items={picks} />}
        <Row kicker="Layar lebar" title="Film Populer" items={clean(rows.movPop)} />
        <Row kicker="Binge-worthy" title="Series Populer" items={clean(rows.tvPop)} />
        <Row kicker="Uji nyali" title="Horor Pilihan" items={clean(rows.horor)} />
        <Row kicker="Standar penonton" title="Film Rating Tertinggi" items={clean(rows.movTop)} />
        <Row kicker="Maraton akhir pekan" title="Series Rating Tertinggi" items={clean(rows.tvTop)} />
      </div>
    </>
  )
}
