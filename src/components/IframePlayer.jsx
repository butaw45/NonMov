import { useState, useEffect, useRef, useCallback } from 'react'

// Konstanta
const VIDUKI_ORIGIN = 'https://www.viduki.net'
const VIDUKI_APIS = [1, 2, 3, 4]

/**
 * IframePlayer — embed viduki.net dengan fallback API otomatis.
 *
 * Props:
 *   api         — API viduki yang dipakai (1-4, default 2 = Multi Language)
 *   tmdbId      — TMDB ID (movie atau tv)
 *   type        — 'tv' atau 'movie'
 *   season      — nomor season (TV only)
 *   episode     — nomor episode (TV only)
 *   color       — hex color untuk tema player (opsional)
 *   onError     — callback (msg) kalau semua API gagal
 */
export default function IframePlayer({
  api = 2,
  tmdbId,
  type = 'movie',
  season,
  episode,
  color = '#ef4444',
  onError,
}) {
  const [currentApi, setCurrentApi] = useState(api)
  const [failedApis, setFailedApis] = useState(new Set())
  const [allFailed, setAllFailed] = useState(false)
  const iframeRef = useRef(null)

  // Generate embed URL
  const embedUrl = useCallback(() => {
    const base = `${VIDUKI_ORIGIN}/${currentApi}/${type}/${tmdbId}`
    const tvPath = season && episode ? `/${season}/${episode}` : ''
    const params = color ? `?color=${encodeURIComponent(color)}` : ''
    return `${base}${tvPath}${params}`
  }, [currentApi, tmdbId, type, season, episode, color])

  // PostMessage listener untuk fallback
  useEffect(() => {
    function onMessage(event) {
      // Validasi origin
      if (event.origin !== VIDUKI_ORIGIN) return

      const data = event.data
      if (data?.type !== 'viduki:all-servers-failed') return

      // Jangan auto-retry kalau stage manual-switch
      if (data.stage === 'manual-switch') return

      // Tandai API yang gagal
      setFailedApis((prev) => new Set(prev).add(currentApi))

      // Cari API berikutnya
      const nextApi = VIDUKI_APIS.find((a) => !failedApis.has(a) && a !== currentApi)

      if (nextApi) {
        // Auto fallback ke API berikutnya
        setCurrentApi(nextApi)
      } else {
        // Semua API gagal
        setAllFailed(true)
        onError?.(data.message || 'Semua server viduki gagal')
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [currentApi, failedApis, onError])

  // Reset state kalau props berubah
  useEffect(() => {
    setCurrentApi(api)
    setFailedApis(new Set())
    setAllFailed(false)
  }, [api, tmdbId, type, season, episode])

  // Manual switch API
  const switchApi = useCallback((newApi) => {
    setCurrentApi(newApi)
    setAllFailed(false)
  }, [])

  // Retry API yang sama (kalau stage 'initial' beda dengan 'playback-error')
  const retryCurrent = useCallback(() => {
    // Force reload iframe
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src
    }
    setAllFailed(false)
  }, [])

  // Fallback URL (buka di tab baru)
  const fallbackUrl = useCallback(() => {
    const base = `${VIDUKI_ORIGIN}/4/${type}/${tmdbId}`
    const tvPath = season && episode ? `/${season}/${episode}` : ''
    return `${base}${tvPath}`
  }, [tmdbId, type, season, episode])

  // Render
  return (
    <div className="iframe-player">
      {/* Header: API selector */}
      <div className="iframe-player-header">
        <span className="iframe-player-badge">
          viduki API {currentApi}
          {failedApis.size > 0 && (
            <span className="iframe-player-failed">
              {' '}({failedApis.size} gagal)
            </span>
          )}
        </span>

        {/* Manual switch buttons */}
        <div className="iframe-player-actions">
          {VIDUKI_APIS.filter((a) => a !== currentApi).map((a) => (
            <button
              key={a}
              className="btn btn-ghost btn-sm"
              onClick={() => switchApi(a)}
              disabled={failedApis.has(a)}
            >
              API {a}
            </button>
          ))}
        </div>
      </div>

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={embedUrl()}
        allowFullScreen
        style={{
          width: '100%',
          aspectRatio: '16/9',
          border: 0,
          backgroundColor: '#000',
        }}
        title={`viduki API ${currentApi} — ${type} ${tmdbId}`}
      />

      {/* Fallback UI */}
      {allFailed && (
        <div className="iframe-player-fallback">
          <p>Stream gagal dimuat di semua server viduki.</p>
          <div className="iframe-player-fallback-actions">
            <a
              href={fallbackUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Buka di viduki.net
            </a>
            <button className="btn btn-ghost" onClick={retryCurrent}>
              Coba Lagi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
