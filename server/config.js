// ------------------------------------------------------------------
// Konfigurasi global Seluloid (Issue #10)
// - viduki_enabled: fallback otomatis ke provider Viduki
// - viduki_default_api: API default Viduki (1-4)
// - viduki_color: warna badge Viduki
// ------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = path.join(__dirname, 'config.json')

const DEFAULTS = {
  viduki_enabled: true,
  viduki_default_api: 2,
  viduki_color: '#ef4444',
}

const VIDUKI_APIS = [1, 2, 3, 4]
const COLOR_RE = /^#[0-9a-fA-F]{6}$/

export function getConfig() {
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
    return {
      viduki_enabled: raw.viduki_enabled,
      viduki_default_api: raw.viduki_default_api,
      viduki_color: raw.viduki_color,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function updateConfig(patch) {
  const current = getConfig()
  const next = { ...current }

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
