// Riwayat tontonan aktif (continue watching). Satu entri per judul (key `${type}:${id}`);
// untuk TV tersimpan season/episode terakhir. Pola store sama dengan watchlist.js.
import { useSyncExternalStore } from 'react'

const KEY = 'seluloid:history:v1'
const MAX = 20
const MIN_POS = 3 // posisi < 3 detik dianggap belum mulai — tidak dicatat
const listeners = new Set()

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

let snapshot = read()

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage penuh/pribadi — abaikan, snapshot memori tetap jalan */
  }
  snapshot = list
  listeners.forEach((fn) => fn())
}

const keyOf = (e) => `${e.type}:${e.id}`

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const getSnapshot = () => snapshot

export function useHistory() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function upsertProgress(entry) {
  if (!entry.pos || entry.pos < MIN_POS) return
  const list = read()
  const idx = list.findIndex((x) => keyOf(x) === keyOf(entry))
  const rec = { ...entry, updatedAt: Date.now() }
  if (idx >= 0) list[idx] = rec
  else list.unshift(rec)
  list.sort((a, b) => b.updatedAt - a.updatedAt)
  write(list.slice(0, MAX))
}

export function removeHistory(type, id) {
  write(read().filter((x) => keyOf(x) !== `${type}:${id}`))
}

// Kembalikan posisi detik bila entri cocok; untuk TV hanya cocok saat season
// DAN episode sama dengan yang tersimpan (jangan resume episode lain).
export function restorePosition(type, id, season, episode) {
  const e = read().find((x) => keyOf(x) === `${type}:${id}`)
  if (!e) return 0
  if (type === 'tv' && (e.season !== season || e.episode !== episode)) return 0
  return e.pos
}
