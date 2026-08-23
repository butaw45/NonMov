import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tmdb, img, catalogLookup, HAS_KEY, pickProviders } from '../../src/lib/tmdb'

function createMockFetch(status = 200, body = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

function createMockFetchError(status) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', createMockFetch(200, { results: [{ id: 1, title: 'Test Movie' }] }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('tmdb API methods', () => {
  it('trending calls correct endpoint', async () => {
    const data = await tmdb.trending('day')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toContain('/trending/all/day')
    expect(data.results).toEqual([{ id: 1, title: 'Test Movie' }])
  })

  it('moviePopular with default page', async () => {
    await tmdb.moviePopular()
    expect(fetch.mock.calls[0][0]).toContain('/movie/popular')
  })

  it('movie returns a single movie', async () => {
    vi.stubGlobal('fetch', createMockFetch(200, { id: 1, title: 'Test Movie' }))
    const data = await tmdb.movie(1)
    expect(fetch.mock.calls[0][0]).toContain('/movie/1')
    expect(data.id).toBe(1)
  })

  it('tv returns a single tv show', async () => {
    vi.stubGlobal('fetch', createMockFetch(200, { id: 2, name: 'Test TV' }))
    const data = await tmdb.tv(2)
    expect(fetch.mock.calls[0][0]).toContain('/tv/2')
    expect(data.id).toBe(2)
  })

  it('season returns season data', async () => {
    vi.stubGlobal('fetch', createMockFetch(200, { id: 10, season_number: 1 }))
    const data = await tmdb.season(2, 1)
    expect(fetch.mock.calls[0][0]).toContain('/tv/2/season/1')
    expect(data.season_number).toBe(1)
  })

  it('searchMulti passes query param', async () => {
    await tmdb.searchMulti('batman')
    const url = fetch.mock.calls[0][0]
    expect(url).toContain('/search/multi')
    expect(url).toContain('query=batman')
  })
})

describe('error handling', () => {
  it('throws on 401 status', async () => {
    vi.stubGlobal('fetch', createMockFetchError(401))
    await expect(tmdb.movie(999)).rejects.toThrow('API key TMDB tidak valid')
  })

  it('throws on 404 status', async () => {
    vi.stubGlobal('fetch', createMockFetchError(404))
    await expect(tmdb.movie(997)).rejects.toThrow('tidak ditemukan di TMDB')
  })

  it('throws on generic error', async () => {
    vi.stubGlobal('fetch', createMockFetchError(500))
    await expect(tmdb.movie(998)).rejects.toThrow('Gagal mengambil data dari TMDB')
  })

  it('network failure rejects with TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')))
    await expect(tmdb.trending()).rejects.toThrow('Network error')
  })
})

describe('img', () => {
  it('returns full URL with default size', () => {
    expect(img('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg')
  })

  it('returns full URL with given size', () => {
    expect(img('/def.jpg', 'original')).toBe('https://image.tmdb.org/t/p/original/def.jpg')
  })

  it('returns null when path is falsy', () => {
    expect(img(null)).toBeNull()
    expect(img('')).toBeNull()
    expect(img(undefined)).toBeNull()
  })
})

describe('catalogLookup', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns data on successful fetch', async () => {
    vi.stubGlobal('fetch', createMockFetch(200, { tmdb_id: 1, type: 'movie' }))
    const result = await catalogLookup(1, 'movie')
    expect(result.tmdb_id).toBe(1)
    expect(fetch.mock.calls[0][0]).toContain('/api/catalog/lookup')
  })

  it('returns null on non-ok response', async () => {
    vi.stubGlobal('fetch', createMockFetchError(404))
    const result = await catalogLookup(1, 'movie')
    expect(result).toBeNull()
  })

  it('returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')))
    const result = await catalogLookup(1, 'movie')
    expect(result).toBeNull()
  })
})

describe('pickProviders', () => {
  it('returns empty array when no ID region', () => {
    expect(pickProviders({ results: {} })).toEqual([])
  })

  it('returns empty array when no results', () => {
    expect(pickProviders({})).toEqual([])
  })

  it('extracts flatrate providers', () => {
    const data = {
      results: {
        ID: {
          link: 'https://example.com',
          flatrate: [{ provider_id: 1, provider_name: 'Netflix', logo_path: '/n.png' }, { provider_id: 2, provider_name: 'Disney+', logo_path: '/d.png' }],
        },
      },
    }
    const result = pickProviders(data)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Netflix')
    expect(result[1].name).toBe('Disney+')
  })

  it('falls back to free providers when no flatrate', () => {
    const data = {
      results: {
        ID: {
          link: 'https://example.com',
          free: [{ provider_id: 1, provider_name: 'Vidio', logo_path: '/v.png' }],
        },
      },
    }
    const result = pickProviders(data)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Vidio')
  })

  it('caps at 4 providers', () => {
    const providers = Array.from({ length: 6 }, (_, i) => ({
      provider_id: i, provider_name: `P${i}`, logo_path: `/p${i}.png`,
    }))
    const data = { results: { ID: { link: '#', flatrate: providers } } }
    expect(pickProviders(data)).toHaveLength(4)
  })

  it('deduplicates by provider_id', () => {
    const providers = [
      { provider_id: 1, provider_name: 'Netflix', logo_path: '/n.png' },
      { provider_id: 1, provider_name: 'Netflix Dupp', logo_path: '/n2.png' },
      { provider_id: 2, provider_name: 'Prime', logo_path: '/p.png' },
    ]
    const data = { results: { ID: { link: '#', flatrate: providers } } }
    const result = pickProviders(data)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Netflix')
  })
})