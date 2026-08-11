import { useEffect, useState } from 'react'
import { tmdb } from '../lib/tmdb'
import { useWatchlist } from '../lib/watchlist'
import { useTitle } from '../lib/hooks'
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
  const watchlist = useWatchlist()

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

  // Sentuhan personal (P1 PRD): rekomendasi dari judul pertama yang disimpan.
  useEffect(() => {
    if (!watchlist.length) {
      setPicks(null)
      return
    }
    const seed = watchlist[0]
    let alive = true
    tmdb
      .recommendations(seed.type, seed.id)
      .then((d) => {
        if (alive) setPicks({ seed: seed.title, items: d.results?.filter((x) => x.poster_path) || [] })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [watchlist])

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
        {picks && picks.items.length > 0 && (
          <Row kicker={`Karena kamu menyimpan “${picks.seed}”`} title="Dipilih untuk Kamu" items={picks.items} />
        )}
        <Row kicker="Layar lebar" title="Film Populer" items={clean(rows.movPop)} />
        <Row kicker="Binge-worthy" title="Series Populer" items={clean(rows.tvPop)} />
        <Row kicker="Uji nyali" title="Horor Pilihan" items={clean(rows.horor)} />
        <Row kicker="Standar penonton" title="Film Rating Tertinggi" items={clean(rows.movTop)} />
        <Row kicker="Maraton akhir pekan" title="Series Rating Tertinggi" items={clean(rows.tvTop)} />
      </div>
    </>
  )
}
