// ------------------------------------------------------------------
// Registri & resolusi penyedia tontonan (Issue #13 + #19: Provider Registry)
// Kontrak publik dikonsumsi Watch.jsx, AdminEntry.jsx, AdminSettings.jsx.
// Plain functions, tanpa framework. Shape provider:
//   self:  { type:'self',   label?, video_url?, video_type? }
//   embed: { type:'embed',  label?, movie_url?, tv_url?, media_type?, enabled? }
//   Template embed memakai placeholder {tmdb_id}, {season}, {episode}.
// ------------------------------------------------------------------

export const PROVIDER_LABELS = { self: 'Self-hosted', embed: 'embed' }

// Bangun URL akhir dari template provider embed.
// Kotak placeholder kosong diisi string kosong (season/episode opsional).
export function buildEmbedUrl(template, { tmdb_id, season, episode }) {
  return template
    .replaceAll('{tmdb_id}', String(tmdb_id ?? ''))
    .replaceAll('{season}', String(season ?? ''))
    .replaceAll('{episode}', String(episode ?? ''))
}

// Normalisasi satu provider: isi label default dari type,
// hanya bawa field type-specific yang dikenal (abaikan lainnya).
export function normalizeProvider(p) {
  if (!p || typeof p !== 'object') return null
  const type = p.type
  if (type !== 'self' && type !== 'embed') return null

  const out = { type, label: p.label || PROVIDER_LABELS[type] }

  if (type === 'self') {
    if (p.video_url != null) out.video_url = p.video_url
    if (p.video_type != null) out.video_type = p.video_type
  } else if (type === 'embed') {
    // Pertahankan template URL + media_type + id (global pool).
    if (p.id != null) out.id = p.id
    if (p.movie_url != null) out.movie_url = p.movie_url
    if (p.tv_url != null) out.tv_url = p.tv_url
    if (p.media_type != null) out.media_type = p.media_type
    if (p.enabled != null) out.enabled = p.enabled
  }

  return out
}

// entry.providers → Provider[] ternormalisasi, FILTER self-only
// (override per-judul kini khusus self), null jika kosong/absent.
export function entryProviders(entry) {
  const list = entry?.providers
  if (!Array.isArray(list) || list.length === 0) return null
  const normalized = list
    .map(normalizeProvider)
    .filter((p) => p && p.type === 'self')
  return normalized.length > 0 ? normalized : null
}

// Flat fields legacy → Provider[] (backward compat).
// HANYA legacy flat self.
export function flatToProviders(entry) {
  if (!entry) return []
  const vp = entry.video_provider
  if (vp === 'self') {
    const p = { type: 'self', label: 'Self-hosted' }
    if (entry.video_url != null) p.video_url = entry.video_url
    if (entry.video_type != null) p.video_type = entry.video_type
    return [p]
  }
  return []
}

// RESOLUSI UTAMA — dipakai Watch.jsx & AdminEntry.jsx.
// Urutan: override self per-entry → flat self legacy → global pool → [].
export function resolveProviders(entry, config, kind) {
  const overrides = entryProviders(entry)
  if (overrides) return overrides
  const flat = flatToProviders(entry)
  if (flat.length) return flat
  return (config?.providers || []).filter(
    (p) =>
      p &&
      typeof p === 'object' &&
      p.enabled &&
      (p.media_type == null || p.media_type === kind),
  )
}
