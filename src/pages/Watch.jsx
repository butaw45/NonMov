import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Artplayer from 'artplayer'
import Hls from 'hls.js'
import { tmdb, img, pickProviders, catalogLookup } from '../lib/tmdb'
import { useTitle } from '../lib/hooks'
import { runtimeLabel } from '../lib/utils'
import { restorePosition, upsertProgress, removeHistory } from '../lib/history'
import { IconArrowL, IconExt } from '../components/Icons'

// Halaman player (PRD P0 #4). URL stream HLS/DASH nantinya datang dari
// katalog internal/backend; sekarang bisa dicoba lewat parameter ?src=.
export default function Watch() {
  const { type, id } = useParams()
  const kind = type === 'tv' ? 'tv' : 'movie'
  const [sp] = useSearchParams()
  const srcQuery = sp.get('src')
  // URL stream final: prioritas ?src= (manual), lalu catalog backend (otomatis)
  const [catalogSrc, setCatalogSrc] = useState(null)
  const src = srcQuery || catalogSrc
  // Konteks episode untuk TV dari query (?season=&episode=) — dipakai resume & label
  const season = kind === 'tv' ? Number(sp.get('season')) || 1 : null
  const episode = kind === 'tv' ? Number(sp.get('episode')) || 1 : null
  const videoRef = useRef(null)
  const [detail, setDetail] = useState(null)
  const [provs, setProvs] = useState([])
  // Daftar episode di halaman player (khusus TV)
  const [watchSeason, setWatchSeason] = useState(season)
  const [watchEps, setWatchEps] = useState(null)
  const [watchEpsLoading, setWatchEpsLoading] = useState(false)
  const [epsOpen, setEpsOpen] = useState(true)
  // Detail terbaru, dibaca saat menyimpan progres (player effect hanya bergantung src)
  const detailRef = useRef(null)
  useEffect(() => {
    detailRef.current = detail
  }, [detail])

  // Season/episode terbaru untuk pencatatan progres — bisa berganti tanpa remount player
  const epRef = useRef({ season, episode })
  useEffect(() => {
    epRef.current = { season, episode }
  }, [season, episode])

  useTitle(
    detail
      ? `Nonton ${detail.title || detail.name}${kind === 'tv' ? ` — S${season}E${episode}` : ''}`
      : 'Nonton'
  )

  // Cari video_url di catalog backend jika tidak ada ?src= manual
  useEffect(() => {
    if (srcQuery || !id) return
    let on = true
    catalogLookup(id, kind)
      .then((entry) => {
        if (!on) return
        const videoUrl = kind === 'tv'
          ? entry?.episodes?.find((ep) => ep.season === season && ep.episode === episode)?.video_url
          : entry?.video_url
        if (videoUrl) setCatalogSrc(videoUrl)
      })
      .catch(() => {})
    return () => { on = false }
  }, [srcQuery, id, kind, season, episode])

  useEffect(() => {
    let on = true
    const fetcher = kind === 'tv' ? tmdb.tv(id) : tmdb.movie(id)
    fetcher.then((d) => { if (on) setDetail(d) }).catch(() => {})
    tmdb.providers(kind, id)
      .then((d) => { if (on) setProvs(pickProviders(d)) })
      .catch(() => {})
    return () => { on = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id])

  // Jaga pilihan season tetap valid begitu detail termuat
  useEffect(() => {
    if (kind !== 'tv' || !detail) return
    const list = detail.seasons || []
    if (list.length > 0 && !list.some((s) => s.season_number === watchSeason)) {
      const first = list.find((s) => s.season_number > 0) || list[0]
      setWatchSeason(first.season_number)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail])

  // Muat daftar episode untuk season yang dipilih di halaman player
  useEffect(() => {
    if (kind !== 'tv' || !detail || watchSeason === null) return
    let on = true
    setWatchEpsLoading(true)
    setWatchEps(null)
    tmdb.season(id, watchSeason)
      .then((d) => {
        if (on) {
          setWatchEps(d.episodes || [])
          setWatchEpsLoading(false)
        }
      })
      .catch(() => {
        if (on) {
          setWatchEps([])
          setWatchEpsLoading(false)
        }
      })
    return () => {
      on = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchSeason, detail?.id])

  useEffect(() => {
    if (!src || !videoRef.current) return
    const isHls = /\.m3u8($|\?)/i.test(src)
    const art = new Artplayer({
      container: videoRef.current,
      url: src,
      type: isHls ? 'm3u8' : '',
      autoplay: true,
      muted: true,
      setting: true,
      pip: true,
      fullscreenWeb: true,
      customType: {
        m3u8: (video, url, artInstance) => {
          if (Hls.isSupported()) {
            if (artInstance.hls) artInstance.hls.destroy()
            const hls = new Hls()
            hls.loadSource(url)
            hls.attachMedia(video)
            artInstance.hls = hls
            artInstance.on('destroy', () => hls.destroy())
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url
          } else {
            artInstance.notice.show = 'Format HLS tidak didukung browser ini'
          }
        },
      },
    })

    // Lanjutkan Menonton: seek ke posisi tersimpan (untuk TV hanya bila season &
    // episode cocok), rekam progres berkala, hapus entri saat selesai, flush saat keluar.
    const start = restorePosition(kind, id, season, episode)
    if (start > 0) {
      art.on('ready', () => {
        art.currentTime = start
      })
    }

    let ended = false
    let lastSave = 0
    const save = () => {
      const d = detailRef.current
      if (!d || !art.duration) return
      lastSave = Date.now()
      upsertProgress({
        type: kind,
        id,
        title: d.title || d.name,
        poster_path: d.poster_path || null,
        ...(kind === 'tv' ? epRef.current : {}),
        pos: art.currentTime,
        dur: art.duration,
      })
    }
    // ArtPlayer mem-proxy event media dengan prefix "video:" (tidak ada "timeupdate"/"ended" polos)
    art.on('video:timeupdate', () => {
      if (Date.now() - lastSave >= 5000) save()
    })
    art.on('video:ended', () => {
      ended = true
      removeHistory(kind, id)
    })

    return () => {
      if (!ended && art.currentTime > 0) save()
      art.destroy(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  const title = detail?.title || detail?.name

  // URL pindah episode: pertahankan ?src dan query lain, ganti season & episode saja
  const epUrl = (s, e) => {
    const q = new URLSearchParams(sp)
    q.set('season', String(s))
    q.set('episode', String(e))
    return `/tonton/tv/${id}?${q}`
  }

  return (
    <div className="watch-page">
      {src ? (
        <>
          <div className="player-shell">
            <div className="player-box" ref={videoRef} />
          </div>
          <div className="watch-meta">
            <Link className="back" to={`/judul/${kind}/${id}`}>
              <IconArrowL size={16} />
              Kembali ke detail
            </Link>
            {title && <h1>{title}</h1>}
          </div>
        </>
      ) : (
        <div className="no-stream">
          <span className="frame" aria-hidden="true" />
          <span className="kicker">Belum tersedia di server kami</span>
          <h1>{title ? `${title} belum bisa diputar langsung` : 'Belum bisa diputar langsung'}</h1>
          <p>
            Kami hanya memutar konten milik atau berlisensi resmi pemilik situs. Judul ini belum
            dipublikasikan oleh admin — sementara itu, kamu bisa menontonnya lewat platform legal
            berikut.
          </p>
          {provs.length > 0 && (
            <div className="providers row-gap">
              {provs.map((p) => (
                <a key={p.id} className="provider-chip" href={p.link} target="_blank" rel="noreferrer">
                  {p.logo && <img src={p.logo} alt="" />}
                  Tonton di {p.name}
                  <span className="ext"><IconExt size={13} /></span>
                </a>
              ))}
            </div>
          )}
          <div className="row-gap">
            <Link className="btn btn-ghost" to={`/judul/${kind}/${id}`}>
              <IconArrowL size={15} />
              Halaman Detail
            </Link>
            <Link className="btn btn-primary" to="/">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      )}

      {kind === 'tv' && detail && (
        <section className="watch-eps">
          <div className="row-head">
            <span className="kicker">Daftar episode</span>
            <h2>Season &amp; Episode</h2>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setEpsOpen((o) => !o)}
              aria-expanded={epsOpen}
            >
              {epsOpen ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
          {epsOpen && (
            <>
              <div className="season-pick">
                <label htmlFor="watch-season" className="muted" style={{ fontWeight: 700 }}>
                  Season
                </label>
                <select
                  id="watch-season"
                  className="field"
                  value={watchSeason ?? ''}
                  onChange={(e) => setWatchSeason(Number(e.target.value))}
                >
                  {(detail.seasons || []).map((s) => (
                    <option key={s.season_number} value={s.season_number}>
                      {s.name || `Season ${s.season_number}`} ({s.episode_count} episode)
                    </option>
                  ))}
                </select>
              </div>
              {watchEpsLoading && <p className="muted">Memuat daftar episode...</p>}
              {watchEps && watchEps.length === 0 && !watchEpsLoading && (
                <p className="muted">Daftar episode untuk season ini belum tersedia.</p>
              )}
              {watchEps && watchEps.length > 0 && (
                <div className="ep-list">
                  {watchEps.map((ep) => {
                    const active = watchSeason === season && ep.episode_number === episode
                    return (
                      <Link
                        className="ep-link"
                        key={ep.id}
                        to={epUrl(watchSeason, ep.episode_number)}
                      >
                        <article className={`ep${active ? ' active' : ''}`}>
                          <div className="still">
                            {ep.still_path && (
                              <img loading="lazy" src={img(ep.still_path, 'w300')} alt="" />
                            )}
                            <span className="epnum">
                              EP {String(ep.episode_number).padStart(2, '0')}
                            </span>
                          </div>
                          <div>
                            <div className="ep-name">
                              {ep.name || `Episode ${ep.episode_number}`}
                              {ep.runtime > 0 && (
                                <span className="dur">{runtimeLabel(ep.runtime)}</span>
                              )}
                            </div>
                            {ep.overview && <p className="ep-over">{ep.overview}</p>}
                          </div>
                        </article>
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}
