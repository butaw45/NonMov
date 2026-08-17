// ------------------------------------------------------------------
// Normalisasi & resolusi penyedia tontonan (Issue #13: Provider Selector)
// Kontrak publik dikonsumsi Watch.jsx & AdminEntry.jsx. Plain functions,
// tanpa framework. Provider shape:
//   self:   { type:'self',   label?, video_url?, video_type? }
//   viduki: { type:'viduki', label?, viduki_api?, viduki_type?, viduki_color? }
// ------------------------------------------------------------------

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
    if (p.viduki_api != null) out.viduki_api = p.viduki_api
    if (p.viduki_type != null) out.viduki_type = p.viduki_type
    if (p.viduki_color != null) out.viduki_color = p.viduki_color
  }

  return out
}

// entry.providers → Provider[] ternormalisasi (drop yang tak dikenal),
// atau null jika kosong/absent.
export function entryProviders(entry) {
  const list = entry?.providers
  if (!Array.isArray(list) || list.length === 0) return null
  const normalized = list.map(normalizeProvider).filter(Boolean)
  return normalized.length > 0 ? normalized : null
}

// Flat fields legacy → Provider[] (backward compat). [] jika tak ada flat provider.
export function flatToProviders(entry) {
  if (!entry) return []
  const vp = entry.video_provider
  if (vp === 'self') {
    const p = { type: 'self', label: 'Self-hosted' }
    if (entry.video_url != null) p.video_url = entry.video_url
    if (entry.video_type != null) p.video_type = entry.video_type
    return [p]
  }
  if (vp === 'viduki') {
    const p = { type: 'viduki', label: 'viduki.net' }
    if (entry.viduki_api != null) p.viduki_api = entry.viduki_api
    if (entry.viduki_type != null) p.viduki_type = entry.viduki_type
    if (entry.viduki_color != null) p.viduki_color = entry.viduki_color
    return [p]
  }
  return []
}

// RESOLUSI UTAMA — dipakai Watch.jsx & AdminEntry.jsx.
export function resolveProviders(entry, config, kind) {
  if (entry?.providers?.length) return entryProviders(entry) || []
  if (entry) return flatToProviders(entry)
  if (config?.viduki_enabled) {
    return [{
      type: 'viduki',
      viduki_api: config.viduki_default_api || 2,
      viduki_type: kind,
      viduki_color: config.viduki_color || '#ef4444',
      label: 'viduki.net (global)',
    }]
  }
  return []
}
