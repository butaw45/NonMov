import { describe, it, expect } from 'vitest'
import {
  buildEmbedUrl,
  normalizeProvider,
  entryProviders,
  flatToProviders,
  resolveProviders,
  PROVIDER_LABELS,
} from '../../src/lib/providers.js'

describe('PROVIDER_LABELS', () => {
  it('has expected labels', () => {
    expect(PROVIDER_LABELS).toEqual({ self: 'Self-hosted', embed: 'embed' })
  })
})

describe('buildEmbedUrl', () => {
  it('replaces all placeholders', () => {
    const url = buildEmbedUrl('https://example.com/embed/{tmdb_id}/s{season}/e{episode}', {
      tmdb_id: 550,
      season: 1,
      episode: 3,
    })
    expect(url).toBe('https://example.com/embed/550/s1/e3')
  })

  it('replaces nullish placeholders with empty string', () => {
    const url = buildEmbedUrl('{tmdb_id}-{season}-{episode}', {
      tmdb_id: 550,
      season: null,
      episode: undefined,
    })
    expect(url).toBe('550--')
  })

  it('handles missing placeholder params', () => {
    const url = buildEmbedUrl('static/path/{tmdb_id}', {})
    expect(url).toBe('static/path/')
  })

  it('returns template unchanged when no placeholders', () => {
    const url = buildEmbedUrl('https://example.com/video', { tmdb_id: 1 })
    expect(url).toBe('https://example.com/video')
  })
})

describe('normalizeProvider', () => {
  it('returns null for non-object input', () => {
    expect(normalizeProvider(null)).toBe(null)
    expect(normalizeProvider(undefined)).toBe(null)
    expect(normalizeProvider('string')).toBe(null)
    expect(normalizeProvider(42)).toBe(null)
  })

  it('returns null for unknown type', () => {
    expect(normalizeProvider({ type: 'hls' })).toBe(null)
    expect(normalizeProvider({ type: 'youtube' })).toBe(null)
  })

  it('normalizes self provider with all fields', () => {
    const result = normalizeProvider({
      type: 'self',
      video_url: 'https://example.com/video.mp4',
      video_type: 'mp4',
      extra: 'ignored',
    })
    expect(result).toEqual({
      type: 'self',
      label: 'Self-hosted',
      video_url: 'https://example.com/video.mp4',
      video_type: 'mp4',
    })
  })

  it('normalizes self provider with minimal fields', () => {
    const result = normalizeProvider({ type: 'self' })
    expect(result).toEqual({ type: 'self', label: 'Self-hosted' })
  })

  it('normalizes embed provider with all fields', () => {
    const result = normalizeProvider({
      type: 'embed',
      id: 'abc123',
      movie_url: 'https://example.com/movie/{tmdb_id}',
      tv_url: 'https://example.com/tv/{tmdb_id}',
      media_type: 'movie',
      enabled: true,
    })
    expect(result).toEqual({
      type: 'embed',
      label: 'embed',
      id: 'abc123',
      movie_url: 'https://example.com/movie/{tmdb_id}',
      tv_url: 'https://example.com/tv/{tmdb_id}',
      media_type: 'movie',
      enabled: true,
    })
  })

  it('uses custom label when provided', () => {
    const result = normalizeProvider({ type: 'self', label: 'My Server' })
    expect(result).toEqual({ type: 'self', label: 'My Server' })
  })
})

describe('entryProviders', () => {
  it('returns null for entry without providers', () => {
    expect(entryProviders({})).toBe(null)
    expect(entryProviders({ providers: null })).toBe(null)
  })

  it('returns null for empty providers array', () => {
    expect(entryProviders({ providers: [] })).toBe(null)
  })

  it('filters to self-type only', () => {
    const entry = {
      providers: [
        { type: 'self', video_url: 'https://a.mp4' },
        { type: 'embed', id: 'e1' },
        { type: 'self', video_url: 'https://b.mp4' },
      ],
    }
    const result = entryProviders(entry)
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('self')
    expect(result[1].type).toBe('self')
  })

  it('returns null when no self providers after filter', () => {
    expect(entryProviders({ providers: [{ type: 'embed' }] })).toBe(null)
  })

  it('validates input is array', () => {
    expect(entryProviders({ providers: 'not-array' })).toBe(null)
  })
})

describe('flatToProviders', () => {
  it('returns self provider when video_provider is self', () => {
    const entry = { video_provider: 'self', video_url: 'https://flat.mp4', video_type: 'hls' }
    const result = flatToProviders(entry)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      type: 'self',
      label: 'Self-hosted',
      video_url: 'https://flat.mp4',
      video_type: 'hls',
    })
  })

  it('returns self provider without optional fields', () => {
    const result = flatToProviders({ video_provider: 'self' })
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ type: 'self', label: 'Self-hosted' })
  })

  it('returns empty array when video_provider is not self', () => {
    expect(flatToProviders({ video_provider: 'embed' })).toEqual([])
    expect(flatToProviders({ video_provider: 'youtube' })).toEqual([])
  })

  it('returns empty array when no video_provider', () => {
    expect(flatToProviders({})).toEqual([])
  })

  it('returns empty array for null entry', () => {
    expect(flatToProviders(null)).toEqual([])
  })
})

describe('resolveProviders', () => {
  it('returns entry self overrides first', () => {
    const entry = { providers: [{ type: 'self', video_url: 'https://override.mp4' }] }
    const config = { providers: [{ type: 'embed', enabled: true }] }
    const result = resolveProviders(entry, config, 'movie')
    expect(result).toHaveLength(1)
    expect(result[0].video_url).toBe('https://override.mp4')
  })

  it('falls back to flat legacy self', () => {
    const entry = { video_provider: 'self', video_url: 'https://flat.mp4' }
    const config = { providers: [{ type: 'embed', enabled: true }] }
    const result = resolveProviders(entry, config, 'movie')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('self')
  })

  it('falls back to global pool filtered by kind', () => {
    const entry = {}
    const config = {
      providers: [
        { type: 'embed', id: 'e1', enabled: true, media_type: 'movie' },
        { type: 'embed', id: 'e2', enabled: true, media_type: 'tv' },
        { type: 'embed', id: 'e3', enabled: false, media_type: 'movie' },
        { type: 'embed', id: 'e4', enabled: true, media_type: null },
      ],
    }
    const result = resolveProviders(entry, config, 'movie')
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.id)).toEqual(['e1', 'e4'])
  })

  it('returns empty array when no providers match', () => {
    expect(resolveProviders({}, {}, 'movie')).toEqual([])
    expect(resolveProviders({}, {}, undefined)).toEqual([])
  })

  it('handles null config gracefully', () => {
    expect(resolveProviders({}, null, 'movie')).toEqual([])
  })
})