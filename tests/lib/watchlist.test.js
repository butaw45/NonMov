import { describe, it, expect, vi, beforeEach } from 'vitest'

const KEY = 'seluloid:watchlist:v1'
const RKEY = 'seluloid:recent-searches:v1'

let mod
async function imp() {
  vi.resetModules()
  mod = await import('../../src/lib/watchlist')
  return mod
}

describe('toggleWatch', () => {
  beforeEach(async () => { await imp() })

  it('adds a movie item and returns true', async () => {
    const added = mod.toggleWatch({ media_type: 'movie', id: 1, title: 'Test', poster_path: '/p.jpg', vote_average: 7.5, release_date: '2024-01-01' })
    expect(added).toBe(true)

    const stored = JSON.parse(localStorage.getItem(KEY))
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe(1)
    expect(stored[0].type).toBe('movie')
    expect(stored[0].title).toBe('Test')
    expect(stored[0].poster_path).toBe('/p.jpg')
    expect(stored[0].vote_average).toBe(7.5)
    expect(stored[0].year).toBe('2024')
    expect(stored[0].addedAt).toBeDefined()
  })

  it('adds a tv item using item.type fallback', async () => {
    const added = mod.toggleWatch({ type: 'tv', id: 2, name: 'Series A', first_air_date: '2023-03-15' })
    expect(added).toBe(true)

    const stored = JSON.parse(localStorage.getItem(KEY))
    expect(stored[0].type).toBe('tv')
    expect(stored[0].title).toBe('Series A')
    expect(stored[0].year).toBe('2023')
  })

  it('removes existing item and returns false', async () => {
    mod.toggleWatch({ media_type: 'movie', id: 1, title: 'Test' })
    expect(JSON.parse(localStorage.getItem(KEY))).toHaveLength(1)

    const added = mod.toggleWatch({ media_type: 'movie', id: 1, title: 'Test' })
    expect(added).toBe(false)
    expect(JSON.parse(localStorage.getItem(KEY))).toHaveLength(0)
  })

  it('handles missing optional fields gracefully', async () => {
    mod.toggleWatch({ media_type: 'movie', id: 99 })
    const stored = JSON.parse(localStorage.getItem(KEY))
    expect(stored[0].title).toBe('Tanpa judul')
    expect(stored[0].poster_path).toBeNull()
    expect(stored[0].vote_average).toBeNull()
    expect(stored[0].year).toBe('')
  })
})

describe('clearWatchlist', () => {
  beforeEach(async () => { await imp() })

  it('removes all watchlist items', async () => {
    mod.toggleWatch({ media_type: 'movie', id: 1, title: 'A' })
    mod.toggleWatch({ media_type: 'tv', id: 2, title: 'B' })
    expect(JSON.parse(localStorage.getItem(KEY))).toHaveLength(2)

    mod.clearWatchlist()
    expect(JSON.parse(localStorage.getItem(KEY))).toHaveLength(0)
  })
})

describe('subscribe / getSnapshot / useWatchlist', () => {
  beforeEach(async () => { await imp() })

  it('getSnapshot returns current watchlist', () => {
    expect(Array.isArray(mod.getSnapshot())).toBe(true)
  })

  it('subscribe notifies on toggle', () => {
    const fn = vi.fn()
    const unsub = mod.subscribe(fn)

    mod.toggleWatch({ media_type: 'movie', id: 5, title: 'X' })
    expect(fn).toHaveBeenCalledTimes(1)

    unsub()
  })

  it('useWatchlist returns entries and rerenders', async () => {
    const { renderHook, act } = await import('@testing-library/react')
    const { result } = renderHook(() => mod.useWatchlist())
    expect(result.current).toEqual([])

    act(() => mod.toggleWatch({ media_type: 'movie', id: 10, title: 'Y' }))
    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe(10)
  })
})

describe('recentSearches', () => {
  beforeEach(async () => { await imp() })

  it('returns empty array when nothing stored', () => {
    expect(mod.recentSearches()).toEqual([])
  })

  it('returns stored searches', () => {
    localStorage.setItem(RKEY, JSON.stringify(['a', 'b']))
    expect(mod.recentSearches()).toEqual(['a', 'b'])
  })

  it('returns empty array on parse error', () => {
    localStorage.setItem(RKEY, 'not-json')
    expect(mod.recentSearches()).toEqual([])
  })
})

describe('pushRecentSearch', () => {
  beforeEach(async () => { await imp() })
  afterEach(() => { localStorage.removeItem(RKEY) })

  it('adds a search to the front', () => {
    mod.pushRecentSearch('spongebob')
    expect(mod.recentSearches()).toEqual(['spongebob'])
  })

  it('dedupes case-insensitively and prepends', () => {
    mod.pushRecentSearch('Batman')
    mod.pushRecentSearch('batman')
    expect(mod.recentSearches()).toEqual(['batman'])
  })

  it('caps at 8 entries', () => {
    for (let i = 0; i < 10; i++) mod.pushRecentSearch(String(i))
    const list = mod.recentSearches()
    expect(list).toHaveLength(8)
    expect(list[0]).toBe('9')
  })
})