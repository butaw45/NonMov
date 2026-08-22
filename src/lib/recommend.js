const keyOf = (x) => `${x.type}:${x.id}`

// Gabungkan seed dari watchlist + history; unik per type:id
// bobot: history (2) > watchlist (1); tiebreak: terbaru
// diversifikasi tipe: bila semua seed homogen, swap satu dengan kandidat tipe berbeda
export function collectSeeds(watchlist = [], history = [], n = 3) {
  const seen = new Map()
  for (const h of history) {
    if (h?.id == null || !h.type) continue
    const k = keyOf(h)
    if (!seen.has(k)) seen.set(k, { type: h.type, id: h.id, title: h.title, w: 2, t: h.updatedAt || 0 })
  }
  for (const wl of watchlist) {
    if (wl?.id == null || !wl.type) continue
    const k = keyOf(wl)
    if (!seen.has(k)) seen.set(k, { type: wl.type, id: wl.id, title: wl.title, w: 1, t: wl.addedAt || 0 })
  }
  let sorted = [...seen.values()].sort((a, b) => b.w - a.w || b.t - a.t)

  // Diversifikasi: jika n ≥ 2 dan semua seed di top-n bertipe sama,
  // coba swap seed terakhir dengan kandidat tersisa dari tipe berbeda
  const picked = sorted.slice(0, n)
  const types = new Set(picked.map((s) => s.type))
  if (types.size < 2) {
    const otherType = sorted[0]?.type === 'movie' ? 'tv' : 'movie'
    const swapIdx = picked.findLastIndex((s) => s.type !== otherType)
    if (swapIdx >= 0) {
      const replacement = sorted.slice(n).find((s) => s.type === otherType)
      if (replacement) {
        sorted = [...sorted.slice(0, swapIdx), replacement, ...sorted.slice(swapIdx + 1)]
      }
    }
  }

  return sorted.slice(0, n).map(({ type, id, title }) => ({ type, id, title }))
}

// Gabung + skor hasil rekomendasi multi-seed
// skor = ∑(1 + vote_average/10) per seed yang merekomendasikan
// dedup, exclude, filter no-poster, urutkan skor desc → top limit
export function scoreRecommendations(seedResults = [], excludeKeys = new Set(), limit = 20) {
  const acc = new Map()
  for (const { results } of seedResults) {
    for (const it of results || []) {
      if (!it || it.id == null || !it.poster_path) continue
      const type = it.media_type || it.type
      if (!type) continue
      const k = `${type}:${it.id}`
      if (excludeKeys.has(k)) continue
      const cur = acc.get(k) || { item: it, score: 0 }
      // 1 per seed + vote_average/10 (TMDB range 0-10 → kontribusi max 1.0)
      cur.score += 1 + (it.vote_average || 0) / 10
      acc.set(k, cur)
    }
  }
  return [...acc.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item)
}