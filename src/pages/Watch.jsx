import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Artplayer from 'artplayer'
import Hls from 'hls.js'
import { tmdb, pickProviders } from '../lib/tmdb'
import { useTitle } from '../lib/hooks'
import { IconArrowL, IconExt } from '../components/Icons'

// Halaman player (PRD P0 #4). URL stream HLS/DASH nantinya datang dari
// katalog internal/backend; sekarang bisa dicoba lewat parameter ?src=.
export default function Watch() {
  const { type, id } = useParams()
  const kind = type === 'tv' ? 'tv' : 'movie'
  const [sp] = useSearchParams()
  const src = sp.get('src')
  const videoRef = useRef(null)
  const [detail, setDetail] = useState(null)
  const [provs, setProvs] = useState([])

  useTitle(detail ? `Nonton ${detail.title || detail.name}` : 'Nonton')

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
    return () => art.destroy(false)
  }, [src])

  const title = detail?.title || detail?.name

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
    </div>
  )
}
