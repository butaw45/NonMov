// Filter browse: rating slider + negara asal
// COUNTRIES: daftar negara umum (ISO 3166-1) untuk with_origin_country
// DEBOUNCE_MS: penundaan slider → URL (anti-spam API)
// ratingParam: konversi nilai rating → parameter TMDB, dengan vote_count.gte collision-safe

export const COUNTRIES = [
  { code: 'ID', name: 'Indonesia' },
  { code: 'US', name: 'Amerika Serikat' },
  { code: 'KR', name: 'Korea Selatan' },
  { code: 'JP', name: 'Jepang' },
  { code: 'GB', name: 'Inggris' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'Tiongkok' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Filipina' },
  { code: 'FR', name: 'Prancis' },
  { code: 'DE', name: 'Jerman' },
]

export const DEBOUNCE_MS = 300

const MIN_VOTES = 100

// min <= 0 / kosong → null (tanpa filter rating)
// existingCountGte → Math.max(100, existingCountGte) — cegah
//   override sort-by-rating threshold (vote_count.gte=200) jadi 100
export function ratingParam(min, existingCountGte) {
  const v = Number(min)
  if (!Number.isFinite(v) || v <= 0) return null
  return { gte: v, countGte: Math.max(MIN_VOTES, existingCountGte || 0) }
}