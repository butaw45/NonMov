// Watchlist disimpan lokal di browser (PRD: tanpa akun viewer dulu).
// Pakai useSyncExternalStore supaya semua komponen sinkron saat berubah.

import { useSyncExternalStore } from 'react'

const KEY = 'seluloid:watchlist:v1'
const RKEY = 'seluloid:recent-searches:v1'
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
    /* storage penuh/pribadi — abaikan */
  }
  snapshot = list
  listeners.forEach((fn) => fn())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const getSnapshot = () => snapshot

export function useWatchlist() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function toggleWatch(item) {
  const type = item.media_type || item.type
  const key = `${type}:${item.id}`
  const list = read()
  const idx = list.findIndex((x) => `${x.type}:${x.id}` === key)
  if (idx >= 0) {
    list.splice(idx, 1)
  } else {
    list.unshift({
      id: item.id,
      type,
      title: item.title || item.name || 'Tanpa judul',
      poster_path: item.poster_path || null,
      vote_average: item.vote_average ?? null,
      year: String(item.release_date || item.first_air_date || '').slice(0, 4),
      addedAt: Date.now(),
    })
  }
  write(list)
  return idx < 0 // true = baru ditambahkan
}

export function clearWatchlist() {
  write([])
}

export function recentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RKEY)) || []
  } catch {
    return []
  }
}

export function pushRecentSearch(q) {
  const list = [q, ...recentSearches().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8)
  try {
    localStorage.setItem(RKEY, JSON.stringify(list))
  } catch {
    /* abaikan */
  }
}
