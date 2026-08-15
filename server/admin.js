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

export function createEntry({ type, tmdb_id, title, status, video_url, video_type, episodes }) {
  if (!['movie', 'tv'].includes(type)) throw new Error('type harus movie atau tv')
  const tid = Number(tmdb_id)
  if (!Number.isInteger(tid) || tid <= 0) throw new Error('tmdb_id harus integer positif')
  if (entryExists(tid, type)) throw new Error(`Entry untuk TMDB ID ${tid} (${type}) sudah ada`)

  const st = status === 'published' ? 'published' : 'draft'
  if (video_url && !/^https?:\/\//.test(video_url)) {
    throw new Error('video_url harus diawali http:// atau https://')
  }

  const now = new Date().toISOString()
  const entry = {
    id: `${tid}-${type}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`,
    type,
    tmdb_id: tid,
    title: title || '',
    status: st,
    video_url: video_url || null,
    video_type: video_url ? (video_type || 'hls') : null,
    episodes: Array.isArray(episodes) ? episodes : undefined,
    created_at: now,
    updated_at: now,
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
  const next = { ...cur }

  if (patch.status !== undefined) {
    next.status = patch.status === 'published' ? 'published' : 'draft'
  }
  if (patch.video_url !== undefined) {
    if (patch.video_url && !/^https?:\/\//.test(patch.video_url)) {
      throw new Error('video_url harus diawali http:// atau https://')
    }
    next.video_url = patch.video_url || null
  }
  if (patch.video_type !== undefined) {
    next.video_type = patch.video_type || null
  }
  if (patch.episodes !== undefined) {
    next.episodes = Array.isArray(patch.episodes) ? patch.episodes : undefined
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
