// Util kecil untuk bentuk data TMDB yang kadang movie, kadang tv.

export const cx = (...xs) => xs.filter(Boolean).join(' ')

export function titleOf(item) {
  return item.title || item.name || item.original_title || item.original_name || 'Tanpa judul'
}

export function yearOf(item) {
  const d = item.release_date || item.first_air_date
  return d ? String(d).slice(0, 4) : ''
}

export function mediaTypeOf(item) {
  if (item.media_type === 'movie' || item.media_type === 'tv') return item.media_type
  if (item.type === 'movie' || item.type === 'tv') return item.type
  // hasil search/multi punya media_type; fallback aman dari bentuk objeknya
  return item.name && !item.title ? 'tv' : 'movie'
}

export function keyOf(item) {
  return `${mediaTypeOf(item)}:${item.id}`
}

export function ratingOf(item) {
  const v = Number(item.vote_average)
  return v > 0 ? v.toFixed(1) : null
}

export function runtimeLabel(mins) {
  if (!mins) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h} j ${m} mnt` : `${m} mnt`
}

export function catalogNo(id) {
  return `NO. ${String(id).padStart(5, '0')}`
}
