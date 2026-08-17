// ------------------------------------------------------------------
// Konfigurasi global Seluloid (Issue #10, Issue #19 lanjutan)
// - providers: pool embed template global (URL template + placeholder),
//   menimpa judul yang TIDAK punya override self-hosted per-judul.
// - Semua provider embed adalah URL template; tipe viduki legacy
//   dimigrasi otomatis ke embed. Tidak ada warna player (template polos).
// ------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = path.join(__dirname, 'config.json')

const DEFAULTS = {
  providers: [],
}

// Daftar tipe provider global yang dikenal.
const KNOWN_TYPES = ['embed']

// Buat id provider unik (`p_<rand>`), tak diedit user.
function genId() {
  return 'p_' + Math.random().toString(36).slice(2, 10)
}

// Pastikan `value` adalah URL http(s) yang valid; throw bila tidak.
// (iframe src — skema lain seperti javascript: ditolak, paritas dgn validasi video_url admin.)
function assertValidUrl(value, field) {
  let u
  try {
    u = new URL(value)
  } catch {
    throw new Error(`${field} harus berupa URL yang valid`)
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`${field} harus berprotokol http/https`)
  }
}

// Migrasi provider legacy `type:'viduki'` ke embed template.
// Item selain viduki dikembalikan apa adanya (tidak memutasi objek asli).
function migrateProviders(raw) {
  if (!Array.isArray(raw.providers)) return []
  return raw.providers.map((p) => {
    if (p && p.type === 'viduki') {
      // Warna dimigrasi di-drop (per keputusan: template polos).
      return {
        id: p.id || genId(),
        type: 'embed',
        label: p.label || 'viduki.net',
        movie_url: `https://www.viduki.net/${p.viduki_api || 2}/movie/{tmdb_id}`,
        tv_url: `https://www.viduki.net/${p.viduki_api || 2}/tv/{tmdb_id}/{season}/{episode}`,
        media_type: p.media_type ?? null,
        enabled: p.enabled !== false,
      }
    }
    return p
  })
}

// Ada migrasi viduki yang perlu ditulis ulang ke file?
function hasLegacyViduki(raw) {
  if (Array.isArray(raw.providers) && raw.providers.some((p) => p && p.type === 'viduki')) {
    return true
  }
  return Object.keys(raw).some((k) => k.startsWith('viduki_'))
}

// Salinan `raw` tanpa field top-level legacy viduki_*.
function stripLegacyTopLevel(raw) {
  const clean = { ...raw }
  for (const k of Object.keys(clean)) {
    if (k.startsWith('viduki_')) delete clean[k]
  }
  return clean
}

export function getConfig() {
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
    const providers = Array.isArray(raw.providers) ? migrateProviders(raw) : []
    // Tulis ulang bila ada migrasi: simpan hasil mapping & hapus field
    // top-level viduki_* legacy. Kunci lain tetap dipertahankan.
    if (hasLegacyViduki(raw)) {
      writeFileSync(CONFIG_PATH, JSON.stringify({ ...stripLegacyTopLevel(raw), providers }, null, 2) + '\n', 'utf8')
    }
    return { providers }
  } catch {
    return { ...DEFAULTS }
  }
}

// Validasi satu item provider; throw Error dengan pesan spesifik (Indonesia).
function validateProvider(p) {
  if (typeof p !== 'object' || p === null || Array.isArray(p)) {
    throw new Error('item providers harus berupa objek')
  }
  if (p.type !== 'embed') {
    throw new Error(`type provider harus "embed", bukan "${p.type}"`)
  }
  if (typeof p.movie_url !== 'string' || p.movie_url.trim() === '') {
    throw new Error('movie_url wajib diisi berupa string')
  }
  if (!p.movie_url.includes('{tmdb_id}')) {
    throw new Error('movie_url harus mengandung placeholder {tmdb_id}')
  }
  assertValidUrl(p.movie_url, 'movie_url')

  if (p.tv_url !== undefined && p.tv_url !== null) {
    if (typeof p.tv_url !== 'string' || p.tv_url.trim() === '') {
      throw new Error('tv_url bila diisi harus berupa string')
    }
    if (!p.tv_url.includes('{tmdb_id}')) {
      throw new Error('tv_url harus mengandung placeholder {tmdb_id}')
    }
    assertValidUrl(p.tv_url, 'tv_url')
  }

  if (p.media_type !== undefined && p.media_type !== null &&
      p.media_type !== 'movie' && p.media_type !== 'tv') {
    throw new Error('media_type harus null, "movie", atau "tv"')
  }

  // media_type null/tv/absent = mencakup TV → tv_url wajib.
  const coversTv = p.media_type === undefined || p.media_type === null || p.media_type === 'tv'
  if (coversTv && (p.tv_url === undefined || p.tv_url === null)) {
    throw new Error('tv_url wajib diisi bila media_type bukan "movie" (null atau "tv")')
  }

  if (p.enabled !== undefined && typeof p.enabled !== 'boolean') {
    throw new Error('enabled harus boolean')
  }
}

// Normalisasi daftar providers: validasi, beri id bila absent.
function normalizeProviders(providers) {
  if (!Array.isArray(providers)) {
    throw new Error('providers harus berupa array')
  }
  return providers.map((p) => {
    validateProvider(p)
    return { ...p, id: p.id || genId() }
  })
}

export function updateConfig(patch) {
  // Bangun dari parse RAW, bukan proyeksi getConfig(), supaya kunci top-level
  // yang tak dikenal di config.json tidak hilang saat round-trip read->write.
  let raw = {}
  try {
    raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  } catch {
    raw = {}
  }
  const next = {
    ...raw,
    providers: patch.providers !== undefined
      ? normalizeProviders(patch.providers)
      : (Array.isArray(raw.providers) ? migrateProviders(raw) : []),
  }

  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + '\n', 'utf8')
  return next
}
