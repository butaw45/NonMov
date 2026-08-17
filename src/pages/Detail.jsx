import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { tmdb, img, pickProviders } from '../lib/tmdb'
import { useTitle } from '../lib/hooks'
import { useWatchlist, toggleWatch } from '../lib/watchlist'
import { useHistory } from '../lib/history'
import Row from '../components/Row'
import { DetailSkeleton } from '../components/Skeletons'
import { IconStar, IconPlay, IconPlus, IconCheck, IconExt, IconX, IconAlert } from '../components/Icons'
import { runtimeLabel } from '../lib/utils'

export default function Detail() {
  const { type, id } = useParams()
  const kind = type === 'tv' ? 'tv' : 'movie'
  const [detail, setDetail] = useState(null)
  const [providers, setProviders] = useState(null)
  const [error, setError] = useState(null)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [season, setSeason] = useState(null)
  const [eps, setEps] = useState(null)
  const [epsLoading, setEpsLoading] = useState(false)
  // Koleksi/saga untuk film: undefined = belum dicek, null = tidak punya koleksi
  const [coll, setColl] = useState(undefined)
const list = useWatchlist()
const history = useHistory()

  useTitle(detail ? detail.title || detail.name : null)

  useEffect(() => {
    let on = true
    setDetail(null)
    setProviders(null)
    setError(null)
    setSeason(null)
    setEps(null)
    setColl(undefined)
    const fetcher = kind === 'tv' ? tmdb.tv(id) : tmdb.movie(id)
    fetcher
      .then((d) => { if (on) setDetail(d) })
      .catch((e) => { if (on) setError(e.message) })
    tmdb.providers(kind, id)
      .then((d) => { if (on) setProviders(d) })
      .catch(() => {})
    return () => { on = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id])

  // Season pertama (bukan specials) jadi pilihan awal
  useEffect(() => {
    if (kind === 'tv' && detail && season === null) {
      const first = (detail.seasons || []).find((s) => s.season_number > 0)
      setSeason(first ? first.season_number : detail.seasons?.[0]?.season_number ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail])

  useEffect(() => {
    if (kind !== 'tv' || season === null || !detail) return
    let on = true
    setEpsLoading(true)
    setEps(null)
    tmdb.season(id, season)
      .then((d) => { if (on) { setEps(d.episodes || []); setEpsLoading(false) } })
      .catch(() => { if (on) { setEps([]); setEpsLoading(false) } })
    return () => { on = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, detail?.id])

  // Film tidak punya episode — sebagai gantinya tampilkan bagian-bagian saga
  // dari koleksi TMDB (mis. sekuel satu seri), urut tanggal rilis.
  useEffect(() => {
    if (kind !== 'movie' || !detail) return
    const c = detail.belongs_to_collection
    if (!c) { setColl(null); return }
    let on = true
    tmdb.collection(c.id)
      .then((d) => { if (on) setColl(d) })
      .catch(() => { if (on) setColl(null) })
    return () => { on = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, detail?.id])

  const trailer = useMemo(() => {
    const vids = detail?.videos?.results || []
    return (
      vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
      vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
      null
    )
  }, [detail])

  if (error) {
    return (
      <div className="err-wrap">
        <div className="state">
          <IconAlert size={40} />
          <h3>Detail gagal dimuat.</h3>
          <p>{error}</p>
          <Link className="btn btn-ghost" to="/">Kembali ke Beranda</Link>
        </div>
      </div>
    )
  }

  if (!detail) return <DetailSkeleton />

  const title = detail.title || detail.name
  const year = String(detail.release_date || detail.first_air_date || '').slice(0, 4)
  const rating = Number(detail.vote_average) > 0 ? Number(detail.vote_average).toFixed(1) : null
  const runtime = kind === 'movie' ? runtimeLabel(detail.runtime) : null
  const saved = list.some((x) => x.type === kind && x.id === Number(id))
  const provs = pickProviders(providers)
  const cast = (detail.credits?.cast || []).slice(0, 15)
  const similar = (detail.recommendations?.results || []).filter((x) => x.poster_path)
  const seasons = (detail.seasons || []).filter((s) => s.season_number > 0)
  // Bagian saga urut tanggal rilis; yang tanpa tanggal ditaruh di akhir
  const collParts = coll?.parts
    ? [...coll.parts].sort((a, b) =>
        String(a.release_date || '9999').localeCompare(String(b.release_date || '9999'))
      )
    : []

  return (
    <div>
      <section className="detail-hero">
        {detail.backdrop_path && (
          <div className="detail-backdrop">
            <img src={img(detail.backdrop_path, 'w1280')} alt="" />
          </div>
        )}
        <div className="container detail-top">
          <div className="detail-poster">
            {detail.poster_path && (
              <img src={img(detail.poster_path, 'w500')} alt={`Poster ${title}`} />
            )}
          </div>
          <div>
            <span className="kicker">
              {kind === 'tv' ? 'Series' : 'Film'}{year && ` · ${year}`}
            </span>
            <h1 className="detail-title">{title}</h1>
            {detail.tagline && <p className="detail-tagline">“{detail.tagline}”</p>}

            <div className="detail-meta">
              {rating && (
                <span className="score">
                  <IconStar size={16} />
                  {rating}
                  <small>/10 · {Number(detail.vote_count || 0).toLocaleString('id-ID')} penilaian</small>
                </span>
              )}
              {runtime && <span>{runtime}</span>}
              {kind === 'tv' && detail.number_of_seasons > 0 && (
                <span>
                  {detail.number_of_seasons} season · {detail.number_of_episodes} episode
                </span>
              )}
            </div>

            <div className="detail-genres">
              {(detail.genres || []).map((g) => <span key={g.id}>{g.name}</span>)}
            </div>

            <p className="detail-overview">
              {detail.overview || 'Sinopsis belum tersedia.'}
            </p>

            <div className="detail-actions">
              {(() => {
                let watchHref = `/tonton/${kind}/${id}`
                if (kind === 'tv') {
                  const h = history.find((e) => e.type === 'tv' && e.id === Number(id))
                  if (h && h.season != null && h.episode != null) {
                    watchHref = `/tonton/tv/${id}?season=${h.season}&episode=${h.episode}`
                  }
                }
                return (
                  <Link className="btn btn-primary" to={watchHref}>
                    <IconPlay size={15} />
                    Tonton Sekarang
                  </Link>
                )
              })()}
              {trailer && (
                <button className="btn btn-ghost" onClick={() => setTrailerOpen(true)}>
                  <IconPlay size={15} />
                  Trailer
                </button>
              )}
              <button
                className="btn btn-ghost"
                onClick={() => toggleWatch({ ...detail, media_type: kind })}
              >
                {saved ? <IconCheck size={15} /> : <IconPlus size={15} />}
                {saved ? 'Tersimpan' : 'Simpan'}
              </button>
              <a
                className="btn btn-ghost"
                href={`https://www.themoviedb.org/${kind}/${detail.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <IconExt size={15} />
                Buka di TMDB
              </a>
            </div>

            <div className="watch-box">
              <h3>{kind === 'tv' ? 'Tonton series ini' : 'Tonton film ini'}</h3>
              {provs.length > 0 ? (
                <>
                  <p className="hint" style={{ marginBottom: 12 }}>
                    Platform streaming legal untuk wilayah Indonesia, menurut data TMDB:
                  </p>
                  <div className="providers">
                    {provs.map((p) => (
                      <a key={p.id} className="provider-chip" href={p.link} target="_blank" rel="noreferrer">
                        {p.logo && <img src={p.logo} alt="" />}
                        Tonton di {p.name}
                        <span className="ext"><IconExt size={13} /></span>
                      </a>
                    ))}
                  </div>
                </>
              ) : (
                <p className="hint">
                  Belum ada info penyedia streaming resmi untuk wilayah Indonesia. Konten milik
                  atau berlisensi kami akan tampil di sini dengan player langsung begitu
                  dipublikasikan admin.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container detail-body">
        {cast.length > 0 && (
          <section>
            <div className="row-head">
              <span className="kicker">Pemeran</span>
              <h2>Cast Utama</h2>
            </div>
            <div className="cast-track">
              {cast.map((c) => (
                <div className="cast-card" key={c.cast_id ?? c.credit_id}>
                  <div className="ph">
                    {c.profile_path ? (
                      <img loading="lazy" src={img(c.profile_path, 'w185')} alt={c.name} />
                    ) : (
                      <div className="noimg">{c.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="nm">{c.name}</div>
                  <div className="ch">{c.character}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {kind === 'tv' && seasons.length > 0 && (
          <section>
            <div className="row-head">
              <span className="kicker">Daftar episode</span>
              <h2>Season &amp; Episode</h2>
            </div>
            <div className="season-pick">
              <label htmlFor="season" className="muted" style={{ fontWeight: 700 }}>
                Season
              </label>
              <select
                id="season"
                className="field"
                value={season ?? ''}
                onChange={(e) => setSeason(Number(e.target.value))}
              >
                {seasons.map((s) => (
                  <option key={s.season_number} value={s.season_number}>
                    {s.name || `Season ${s.season_number}`} ({s.episode_count} episode)
                  </option>
                ))}
              </select>
            </div>
            {epsLoading && <p className="muted">Memuat daftar episode…</p>}
            {eps && (
              <div className="ep-list">
                {eps.length === 0 && (
                  <p className="muted">Daftar episode untuk season ini belum tersedia.</p>
                )}
                {eps.map((ep) => (
                  <Link
                    className="ep-link"
                    key={ep.id}
                    to={`/tonton/tv/${id}?season=${season}&episode=${ep.episode_number}`}
                  >
                    <article className="ep">
                      <div className="still">
                        {ep.still_path && (
                          <img loading="lazy" src={img(ep.still_path, 'w300')} alt="" />
                        )}
                        <span className="epnum">EP {String(ep.episode_number).padStart(2, '0')}</span>
                      </div>
                      <div>
                        <div className="ep-name">
                          {ep.name || `Episode ${ep.episode_number}`}
                          {ep.runtime > 0 && <span className="dur">{runtimeLabel(ep.runtime)}</span>}
                        </div>
                        {ep.overview && <p className="ep-over">{ep.overview}</p>}
                        <span className="btn btn-primary btn-sm ep-watch">
                          <IconPlay size={13} /> Tonton EP {ep.episode_number}
                        </span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {kind === 'movie' && (
          <section>
            <div className="row-head">
              <span className="kicker">{coll ? 'Satu saga' : 'Daftar tayangan'}</span>
              <h2>{coll ? `Koleksi ${coll.name}` : 'Film Utama'}</h2>
            </div>
            {coll === undefined && detail.belongs_to_collection && (
              <p className="muted">Memuat daftar koleksi…</p>
            )}
            {coll !== undefined && (
              <div className="ep-list">
                {collParts.length > 0 ? (
                  collParts.map((p, i) => {
                    const current = p.id === detail.id
                    const card = (
                      <>
                        <div className="still">
                          {(p.backdrop_path || p.poster_path) && (
                            <img loading="lazy" src={img(p.backdrop_path || p.poster_path, 'w300')} alt="" />
                          )}
                          <span className="epnum">FILM {i + 1}</span>
                        </div>
                        <div>
                          <div className="ep-name">
                            {p.title}
                            {p.release_date && (
                              <span className="dur">{String(p.release_date).slice(0, 4)}</span>
                            )}
                            {current && <span className="dur">· Sedang dibuka</span>}
                          </div>
                          {p.overview && <p className="ep-over">{p.overview}</p>}
                        </div>
                      </>
                    )
                    return current ? (
                      <article className="ep" key={p.id}>{card}</article>
                    ) : (
                      <Link className="ep-link" to={`/judul/movie/${p.id}`} key={p.id}>
                        <article className="ep">{card}</article>
                      </Link>
                    )
                  })
                ) : (
                  <article className="ep">
                    <div className="still">
                      {detail.backdrop_path && (
                        <img loading="lazy" src={img(detail.backdrop_path, 'w300')} alt="" />
                      )}
                      <span className="epnum">FILM</span>
                    </div>
                    <div>
                      <div className="ep-name">
                        {title}
                        {runtime && <span className="dur">{runtime}</span>}
                      </div>
                      {detail.overview && <p className="ep-over">{detail.overview}</p>}
                    </div>
                  </article>
                )}
              </div>
            )}
          </section>
        )}

        {similar.length > 0 && (
          <Row kicker="Kalau kamu suka ini" title="Judul Serupa" items={similar} />
        )}
      </div>

      {trailerOpen && trailer && (
        <div className="modal-veil" onClick={() => setTrailerOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <button className="btn btn-ghost btn-sm" onClick={() => setTrailerOpen(false)}>
                <IconX size={14} />
                Tutup
              </button>
            </div>
            <div className="modal-frame">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1`}
                title={`Trailer ${title}`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
