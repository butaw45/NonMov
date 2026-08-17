// ------------------------------------------------------------------
// Registri & resolusi penyedia tontonan (Issue #13 + #19: Provider Registry)
// Kontrak publik dikonsumsi Watch.jsx, AdminEntry.jsx, AdminSettings.jsx.
// Plain functions, tanpa framework. Shape provider:
//   self:   { type:'self',   label?, video_url?, video_type? }
//   viduki: { type:'viduki', label?, viduki_api?, viduki_color? }
// ------------------------------------------------------------------

export const PROVIDER_TYPES = {
  viduki: { label: 'viduki.net', fields: ['viduki_api', 'viduki_color'], defaultApi: 2 },
}

export const PROVIDER_LABELS = { self: 'Self-hosted', viduki: 'viduki.net' }

// Normalisasi satu provider: isi label default dari type,
// hanya bawa field type-specific yang dikenal (abaikan lainnya).
export function normalizeProvider(p) {
  if (!p || typeof p !== 'object') return null
  const type = p.type
  if (type !== 'self' && type !== 'viduki') return null

  const out = { type, label: p.label || PROVIDER_LABELS[type] }

  if (type === 'self') {
    if (p.video_url != null) out.video_url = p.video_url
    if (p.video_type != null) out.video_type = p.video_type
  } else if (type === 'viduki') {
    // viduki per-entry tak dipakai lagi (lihat resolve); tetap bisa
    // di-normalize utk kontrak lama saja.
    if (p.viduki_api != null) out.viduki_api = p.viduki_api
    if (p.viduki_color != null) out.viduki_color = p.viduki_color
  }

  return out
}

// entry.providers → Provider[] ternormalisasi, FILTER self-only
// (viduki di-drop, karena override per-judul kini khusus self),
// null jika kosong/absent.
export function entryProviders(entry) {
  const list = entry?.providers
  if (!Array.isArray(list) || list.length === 0) return null
  const normalized = list
    .map(normalizeProvider)
    .filter((p) => p && p.type === 'self')
  return normalized.length > 0 ? normalized : null
}

// Flat fields legacy → Provider[] (backward compat).
// HANYA legacy flat self; legacy viduki DIABAIKAN → [].
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
    (p) => p.enabled && (p.media_type == null || p.media_type === kind),
  )
}
