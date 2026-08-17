// ------------------------------------------------------------------
// Konfigurasi global Seluloid (Issue #10, Issue #19)
// - providers: pool provider global (viduki dkk), menimpa judul
//   yang TIDAK punya override self-hosted per-judul.
// - viduki_enabled/viduki_default_api/viduki_color: field legacy,
//   hanya dipakai untuk migrasi; UI tidak merender lagi.
// ------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = path.join(__dirname, 'config.json')

const DEFAULTS = {
  providers: [],
  viduki_enabled: true,
  viduki_default_api: 2,
  viduki_color: '#ef4444',
}

export const VIDUKI_APIS = [1, 2, 3, 4]
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/

// Daftar tipe provider global yang dikenal.
const KNOWN_TYPES = ['viduki']

// Buat id provider unik (`p_<rand>`), tak diedit user.
function genId() {
  return 'p_' + Math.random().toString(36).slice(2, 10)
}

// Seed satu provider viduki dari field legacy bila belum ada `providers`.
// Mengembalikan objek baru (tidak memutasi `config`).
function seedProviders(config) {
  const hasProviders = Array.isArray(config.providers)
  if (hasProviders) return config.providers

  if (config.viduki_enabled !== true) return []

  return [{
    id: genId(),
    type: 'viduki',
    label: 'viduki.net',
    viduki_api: config.viduki_default_api || 2,
    viduki_color: config.viduki_color || '#ef4444',
    media_type: null,
    enabled: true,
  }]
}

export function getConfig() {
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
    const providers = seedProviders(raw)
    // Simpan hasil seed kalau terjadi migrasi (config belum punya providers).
    if (!Array.isArray(raw.providers)) {
      writeFileSync(CONFIG_PATH, JSON.stringify({ ...raw, providers }, null, 2) + '\n', 'utf8')
    }
    return {
      providers,
      viduki_enabled: raw.viduki_enabled,
      viduki_default_api: raw.viduki_default_api,
      viduki_color: raw.viduki_color,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

// Validasi satu item provider; throw Error dengan pesan spesifik.
function validateProvider(p) {
  if (typeof p !== 'object' || p === null) {
    throw new Error('item providers harus berupa objek')
  }
  if (!KNOWN_TYPES.includes(p.type)) {
    throw new Error(`type provider tidak dikenal: ${p.type}`)
  }
  if (p.viduki_api !== undefined && !VIDUKI_APIS.includes(p.viduki_api)) {
    throw new Error('viduki_api harus salah satu dari 1, 2, 3, 4')
  }
  if (p.viduki_color !== undefined &&
      (typeof p.viduki_color !== 'string' || !COLOR_RE.test(p.viduki_color))) {
    throw new Error('viduki_color harus berformat #RRGGBB')
  }
  if (p.media_type !== undefined && p.media_type !== null &&
      p.media_type !== 'movie' && p.media_type !== 'tv') {
    throw new Error('media_type harus null, "movie", atau "tv"')
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
    // providers: pakai seed dari legacy bila config belum punya `providers`
    providers: Array.isArray(raw.providers) ? raw.providers : seedProviders(raw),
  }

  if (patch.providers !== undefined) {
    next.providers = normalizeProviders(patch.providers)
  }

  if ('viduki_enabled' in patch) next.viduki_enabled = Boolean(patch.viduki_enabled)

  if ('viduki_default_api' in patch) {
    if (!VIDUKI_APIS.includes(patch.viduki_default_api)) {
      throw new Error('viduki_default_api harus salah satu dari 1, 2, 3, 4')
    }
    next.viduki_default_api = patch.viduki_default_api
  }

  if ('viduki_color' in patch) {
    if (typeof patch.viduki_color !== 'string' || !COLOR_RE.test(patch.viduki_color)) {
      throw new Error('viduki_color harus berformat #RRGGBB')
    }
    next.viduki_color = patch.viduki_color
  }

  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + '\n', 'utf8')
  return next
}
