// ------------------------------------------------------------------
// Business logic admin Seluloid (Issue #6)
// - Auth: env-based credentials + session cookie
// - CRUD entri katalog di catalog.json
// - Auto-match TMDB via proxy /3
//
// Dipanggil dari adminRoutes.js — tidak ada logic HTTP di sini.
// ------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CATALOG_PATH = path.join(__dirname, 'catalog.json')

const ADMIN_USER = (process.env.ADMIN_USER || 'admin').trim()
const ADMIN_PASS = (process.env.ADMIN_PASS || '').trim()
const SESSION_TIMEOUT_HOURS = Number(process.env.ADMIN_SESSION_TIMEOUT || 24)
const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_HOURS * 3600 * 1000

// ---- Catalog storage ---------------------------------------------
// Format baru: { entries: [...], sessions: [...] }
// Backward compat: jika file masih array lama, dianggap entries.
function loadStore() {
  if (!existsSync(CATALOG_PATH)) return { entries: [], sessions: [] }
  try {
    const data = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'))
    if (Array.isArray(data)) return { entries: data, sessions: [] }
    return {
      entries: Array.isArray(data.entries) ? data.entries : [],
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
    }
  } catch (e) {
    console.error('[admin] catalog.json tidak valid:', e?.message || e)
    return { entries: [], sessions: [] }
  }
}

function saveStore(store) {
  writeFileSync(CATALOG_PATH, JSON.stringify(store, null, 2) + '\n', 'utf8')
}

// ---- Auth ---------------------------------------------------------

export function verifyCredentials(username, password) {
  if (!ADMIN_PASS) return false
  return username === ADMIN_USER && password === ADMIN_PASS
}

export function createSession() {
  const token = crypto.randomBytes(24).toString('hex')
  const store = loadStore()
  store.sessions.push({ token, created_at: new Date().toISOString() })
  saveStore(store)
  return token
}

export function validateSession(token) {
  if (!token) return false
  const store = loadStore()
  const session = store.sessions.find((s) => s.token === token)
  if (!session) return false
  const age = Date.now() - new Date(session.created_at).getTime()
  if (age > SESSION_TIMEOUT_MS) {
    destroySession(token)
    return false
  }
  return true
}

export function destroySession(token) {
  const store = loadStore()
  store.sessions = store.sessions.filter((s) => s.token !== token)
  saveStore(store)
}

export function sessionTimeoutMs() {
  return SESSION_TIMEOUT_MS
}

// ---- CRUD entries -------------------------------------------------

export function listEntries(statusFilter) {
  const { entries } = loadStore()
  if (!statusFilter) return entries
  return entries.filter((e) => e.status === statusFilter)
}

export function getEntryById(id) {
  const { entries } = loadStore()
  return entries.find((e) => String(e.id) === String(id)) || null
}

function entryExists(tmdb_id, type) {
  const { entries } = loadStore()
  return entries.some((e) => e.tmdb_id === Number(tmdb_id) && e.type === type)
}

// ---- Validasi schema entry ----------------------------------------
const VIDUKI_APIS = [1, 2, 3, 4]

function validateVidukiFields(data, { strict = false } = {}) {
  const provider = data.video_provider || 'self'

  if (provider === 'viduki') {
    // viduki butuh tmdb_id + viduki_type + viduki_api
    if (strict && !data.tmdb_id) throw new Error('tmdb_id wajib untuk viduki')
    if (data.viduki_type && !['tv', 'movie'].includes(data.viduki_type)) {
      throw new Error('viduki_type harus tv atau movie')
    }
    if (data.viduki_api && !VIDUKI_APIS.includes(Number(data.viduki_api))) {
      throw new Error(`viduki_api harus ${VIDUKI_APIS.join('|')}`)
    }
    if (data.viduki_color && !/^#[0-9a-fA-F]{6}$/.test(data.viduki_color)) {
      throw new Error('viduki_color harus format hex #RRGGBB')
    }
    // clear self-hosted fields
    return {
      ...data,
      video_provider: 'viduki',
      video_url: null,
      video_type: null,
      viduki_api: Number(data.viduki_api) || 2,
      viduki_type: data.viduki_type || data.type || 'movie',
      viduki_color: data.viduki_color || '#ef4444',
    }
  }

  // self-hosted
  if (strict && !data.video_url) throw new Error('video_url wajib untuk self-hosted')
  if (data.video_url && !/^https?:\/\//.test(data.video_url)) {
    throw new Error('video_url harus diawali http:// atau https://')
  }
  return {
    ...data,
    video_provider: 'self',
    video_url: data.video_url || null,
    video_type: data.video_url ? (data.video_type || 'hls') : null,
    viduki_api: null,
    viduki_type: null,
    viduki_color: null,
  }
}

const NEXT_HEX = /^#[0-9a-fA-F]{6}$/

// Validasi + normalisasi ringan array provider (Task A — provider selector).
// Dipakai createEntry & updateEntry; tidak diekspor.
function normalizeProviders(providers) {
  if (providers === undefined) return undefined
  if (!Array.isArray(providers) || providers.length === 0) return []

  return providers.map((p, i) => {
    if (typeof p !== 'object' || p === null || Array.isArray(p)) {
      throw new Error(`provider ke-${i + 1} harus berupa objek`)
    }
    const { type, label } = p
    if (type !== 'self' && type !== 'viduki') {
      throw new Error(`provider ke-${i + 1}: type harus self atau viduki`)
    }

    if (type === 'self') {
      const out = { type, label: label || 'Self-hosted' }
      if (p.video_url) out.video_url = p.video_url
      if (p.video_type) out.video_type = p.video_type
      return out
    }

    // viduki
    if (p.viduki_api !== undefined && !VIDUKI_APIS.includes(Number(p.viduki_api))) {
      throw new Error(`provider ke-${i + 1}: viduki_api harus ${VIDUKI_APIS.join('|')}`)
    }
    if (p.viduki_type !== undefined && !['tv', 'movie'].includes(p.viduki_type)) {
      throw new Error(`provider ke-${i + 1}: viduki_type harus tv atau movie`)
    }
    if (p.viduki_color !== undefined && !NEXT_HEX.test(p.viduki_color)) {
      throw new Error(`provider ke-${i + 1}: viduki_color harus format hex #RRGGBB`)
    }
    const out = { type, label: label || 'viduki.net' }
    if (p.viduki_api !== undefined) out.viduki_api = Number(p.viduki_api)
    if (p.viduki_type) out.viduki_type = p.viduki_type
    if (p.viduki_color) out.viduki_color = p.viduki_color
    return out
  })
}

export function createEntry({ type, tmdb_id, title, status, video_url, video_type, episodes, video_provider, viduki_api, viduki_type, viduki_color, providers }) {
  if (!['movie', 'tv'].includes(type)) throw new Error('type harus movie atau tv')
  const tid = Number(tmdb_id)
  if (!Number.isInteger(tid) || tid <= 0) throw new Error('tmdb_id harus integer positif')
  if (entryExists(tid, type)) throw new Error(`Entry untuk TMDB ID ${tid} (${type}) sudah ada`)

  const st = status === 'published' ? 'published' : 'draft'

  const now = new Date().toISOString()
  const normalizedProviders = normalizeProviders(providers)
  const hasProviders = Array.isArray(normalizedProviders) && normalizedProviders.length > 0

  const entry = {
    id: `${tid}-${type}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`,
    type,
    tmdb_id: tid,
    title: title || '',
    status: st,
    episodes: Array.isArray(episodes) ? episodes : undefined,
    created_at: now,
    updated_at: now,
  }

  if (hasProviders) {
    // Mode providers[]: simpan verbatim, tinggalkan flat fields legacy undefined.
    entry.providers = normalizedProviders
  } else {
    // Backward compat: legacy flat single-provider. cases
    const validated = validateVidukiFields(
      { type, tmdb_id, video_url, video_type, video_provider, viduki_api, viduki_type, viduki_color },
      { strict: true }
    )
    entry.video_provider = validated.video_provider
    entry.video_url = validated.video_url
    entry.video_type = validated.video_type
    entry.viduki_api = validated.viduki_api
    entry.viduki_type = validated.viduki_type
    entry.viduki_color = validated.viduki_color
  }
  const store = loadStore()
  store.entries.push(entry)
  saveStore(store)
  return entry
}

export function updateEntry(id, patch) {
  const store = loadStore()
  const idx = store.entries.findIndex((e) => String(e.id) === String(id))
  if (idx === -1) return null

  const cur = store.entries[idx]
  const merged = { ...cur }

  // Merge patch fields ke current (untuk validasi)
  if (patch.status !== undefined) merged.status = patch.status === 'published' ? 'published' : 'draft'
  if (patch.video_url !== undefined) merged.video_url = patch.video_url || null
  if (patch.video_type !== undefined) merged.video_type = patch.video_type || null
  if (patch.video_provider !== undefined) merged.video_provider = patch.video_provider
  if (patch.viduki_api !== undefined) merged.viduki_api = patch.viduki_api
  if (patch.viduki_type !== undefined) merged.viduki_type = patch.viduki_type
  if (patch.viduki_color !== undefined) merged.viduki_color = patch.viduki_color
  if (patch.episodes !== undefined) merged.episodes = patch.episodes

  // Provider selector (Task A): providers[] override — validasi ringan, backward compat dgn flat merge.
  const normalizedProviders = patch.providers !== undefined ? normalizeProviders(patch.providers) : undefined
  if (normalizedProviders !== undefined) merged.providers = normalizedProviders

  // Validasi flat fields HANYA bila patch membawanya (bukan untuk update providers-only).
  const hasFlatPatch =
    patch.video_url !== undefined || patch.video_provider !== undefined ||
    patch.viduki_api !== undefined || patch.viduki_type !== undefined || patch.viduki_color !== undefined
  let validated = null
  if (hasFlatPatch) validated = validateVidukiFields(merged, { strict: true })

  // Hanya update field yang dikirim (bukan merge semua)
  const next = { ...cur }
  if (patch.status !== undefined) next.status = validated ? validated.status : (patch.status === 'published' ? 'published' : 'draft')
  if (patch.video_url !== undefined && validated) next.video_url = validated.video_url
  if (patch.video_type !== undefined && validated) next.video_type = validated.video_type
  if (patch.video_provider !== undefined && validated) next.video_provider = validated.video_provider
  if (patch.viduki_api !== undefined && validated) next.viduki_api = validated.viduki_api
  if (patch.viduki_type !== undefined && validated) next.viduki_type = validated.viduki_type
  if (patch.viduki_color !== undefined && validated) next.viduki_color = validated.viduki_color
  if (patch.episodes !== undefined) next.episodes = patch.episodes
  if (normalizedProviders !== undefined) next.providers = normalizedProviders

  // Pastikan viduki fields di-clear kalau switch ke self
  if (patch.video_provider === 'self' && cur.video_provider === 'viduki') {
    next.viduki_api = null
    next.viduki_type = null
    next.viduki_color = null
  }

  next.updated_at = new Date().toISOString()
  store.entries[idx] = next
  saveStore(store)
  return next
}

export function deleteEntry(id) {
  const store = loadStore()
  const before = store.entries.length
  store.entries = store.entries.filter((e) => String(e.id) !== String(id))
  if (store.entries.length === before) return false
  saveStore(store)
  return true
}

// ---- Auto-match TMDB ----------------------------------------------
// Menggunakan helper proxy internal — panggil TMDB langsung dengan API key
// dari env server (sama seperti index.js proxy).

const TMDB = 'https://api.themoviedb.org/3'
const API_KEY = (process.env.TMDB_API_KEY || '').trim()

export async function searchTMDB(query, type) {
  if (!query) return []
  const url = new URL(`${TMDB}/search/multi`)
  url.searchParams.set('query', query)
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('language', 'en-US')
  url.searchParams.set('page', '1')
  url.searchParams.set('api_key', API_KEY)

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (res.status === 429) throw Object.assign(new Error('Rate limit TMDB'), { status: 429 })
  if (!res.ok) throw Object.assign(new Error('Gagal konek ke TMDB'), { status: 502 })

  const data = await res.json()
  let results = Array.isArray(data.results) ? data.results : []
  results = results.filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
  if (type === 'movie' || type === 'tv') {
    results = results.filter((r) => r.media_type === type)
  }

  return results.slice(0, 10).map((r) => ({
    id: r.id,
    title: r.title || r.name,
    type: r.media_type,
    poster_path: r.poster_path || null,
    overview: r.overview || '',
    year: (r.release_date || r.first_air_date || '').slice(0, 4),
    popularity: r.popularity || 0,
  }))
}

// Ambil judul resmi dari TMDB (untuk auto-fill title saat create manual)
export async function fetchTMDBTitle(tmdb_id, type) {
  const url = `${TMDB}/${type}/${tmdb_id}?language=en-US&api_key=${API_KEY}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return ''
  const data = await res.json()
  return data.title || data.name || ''
}
