// ------------------------------------------------------------------
// Klien API TMDB — dengan cache ringan (memori + sessionStorage, TTL 5 menit)
// supaya respon TMDB tidak diminta ulang-ulang (lihat PRD: Non-Fungsional).
// Catatan: key dipakai langsung dari browser; untuk produksi sebaiknya
// permintaan diproksikan lewat backend sendiri.
// ------------------------------------------------------------------

const API_KEY = (import.meta.env.VITE_TMDB_API_KEY || '').trim()
export const HAS_KEY = API_KEY.length > 0

// Jika VITE_API_BASE diset (produksi/deploy bersama backend), semua request
// TMDB lewat proxy backend — API key tidak terekspos di browser.
// Jika kosong, fallback ke TMDB langsung (butuh VITE_TMDB_API_KEY).
const BASE = (import.meta.env.VITE_API_BASE || 'https://api.themoviedb.org/3').replace(/\/+$/, '')
const IMG = 'https://image.tmdb.org/t/p'

// Helper untuk lookup catalog custom dari backend. Mengembalikan null jika
// tidak ada entri atau backend tidak jalan (frontend tetap berfungsi).
export async function catalogLookup(tmdbId, type) {
  try {
    const res = await fetch(`/api/catalog/lookup?tmdb_id=${tmdbId}&type=${type}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export function img(path, size = 'w342') {
  if (!path) return null
  return `${IMG}/${size}${path}`
}

const TTL = 5 * 60 * 1000
const mem = new Map()

function cacheRead(key) {
  const fromMem = mem.get(key)
  if (fromMem) return fromMem
  try {
    const raw = sessionStorage.getItem('seluloid:tmdb:' + key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.t > TTL) return null
    mem.set(key, parsed.data)
    return parsed.data
  } catch {
    return null
  }
}

function cacheWrite(key, data) {
  mem.set(key, data)
  try {
    sessionStorage.setItem('seluloid:tmdb:' + key, JSON.stringify({ t: Date.now(), data }))
  } catch {
    /* penyimpanan penuh — biarkan, cache memori tetap jalan */
  }
}

async function request(path, params = {}) {
  // Teks TMDB sengaja diambil en-US: sumber utamanya memang Inggris dan
  // terjemahan id-ID sering tidak lengkap (mis. sinopsis episode kosong).
  const merged = { language: 'en-US', include_adult: 'false', ...params }
  if (API_KEY) merged.api_key = API_KEY
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v))
  }
  const key = path + '?' + search.toString()
  const hit = cacheRead(key)
  if (hit) return hit

  const res = await fetch(`${BASE}${path}?${search}`)
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('API key TMDB tidak valid (401). Periksa kembali VITE_TMDB_API_KEY di file .env, lalu muat ulang.')
    }
    if (res.status === 404) {
      throw new Error('Data yang diminta tidak ditemukan di TMDB (404).')
    }
    throw new Error(`Gagal mengambil data dari TMDB (HTTP ${res.status}). Coba lagi sebentar lagi.`)
  }
  const data = await res.json()
  cacheWrite(key, data)
  return data
}

export const tmdb = {
  trending: (win = 'week') => request(`/trending/all/${win}`),
  moviePopular: (page = 1) => request('/movie/popular', { page }),
  tvPopular: (page = 1) => request('/tv/popular', { page }),
  movieTopRated: (page = 1) => request('/movie/top_rated', { page }),
  tvTopRated: (page = 1) => request('/tv/top_rated', { page }),
  searchMulti: (query, page = 1) => request('/search/multi', { query, page }),
  movie: (id) => request(`/movie/${id}`, { append_to_response: 'credits,recommendations,videos' }),
  tv: (id) => request(`/tv/${id}`, { append_to_response: 'credits,recommendations,videos' }),
  season: (tvId, num) => request(`/tv/${tvId}/season/${num}`),
  collection: (id) => request(`/collection/${id}`),
  genres: (type) => request(`/genre/${type}/list`),
  discover: (type, params = {}) => request(`/discover/${type}`, params),
  providers: (type, id) => request(`/${type}/${id}/watch/providers`, { watch_region: 'ID' }),
  recommendations: (type, id) => request(`/${type}/${id}/recommendations`),
}

// Ambil penyedia streaming legal untuk region Indonesia.
// Prioritas: langganan (flatrate), lalu gratis/iklan. Maksimal 4 tombol.
export function pickProviders(data) {
  const region = data?.results?.ID
  if (!region) return []
  const list = region.flatrate || region.free || []
  const seen = new Set()
  return list
    .filter((p) => {
      if (seen.has(p.provider_id)) return false
      seen.add(p.provider_id)
      return true
    })
    .slice(0, 4)
    .map((p) => ({
      id: p.provider_id,
      name: p.provider_name,
      logo: img(p.logo_path, 'w92'),
      link: region.link,
    }))
}
