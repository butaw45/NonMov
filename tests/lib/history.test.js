import { describe, it, expect, vi, beforeEach } from 'vitest'

const KEY = 'seluloid:history:v1'

// Helper — import fresh module each time so in-memory snapshot starts clean
let mod
async function imp() {
  vi.resetModules()
  mod = await import('../../src/lib/history')
  return mod
}

function readStorage() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

describe('upsertProgress', () => {
  beforeEach(async () => { await imp() })

  it('stores entry to localStorage', async () => {
    await imp()
    mod.upsertProgress({ type: 'movie', id: 1, pos: 100 })
    const stored = readStorage()
    expect(stored).toHaveLength(1)
    expect(stored[0].type).toBe('movie')
    expect(stored[0].id).toBe(1)
    expect(stored[0].pos).toBe(100)
    expect(stored[0].updatedAt).toBeDefined()
  })

  it('ignores entry when pos < 3 (MIN_POS)', async () => {
    mod.upsertProgress({ type: 'movie', id: 1, pos: 2 })
    expect(readStorage()).toHaveLength(0)
  })

  it('ignores entry when pos is falsy', async () => {
    mod.upsertProgress({ type: 'movie', id: 1, pos: 0 })
    expect(readStorage()).toHaveLength(0)
  })

  it('ignores entry when pos is undefined', async () => {
    mod.upsertProgress({ type: 'movie', id: 1 })
    expect(readStorage()).toHaveLength(0)
  })

  it('updates existing entry with same key', async () => {
    mod.upsertProgress({ type: 'movie', id: 1, pos: 100 })
    mod.upsertProgress({ type: 'movie', id: 1, pos: 250 })
    const stored = readStorage()
    expect(stored).toHaveLength(1)
    expect(stored[0].pos).toBe(250)
  })

  it('keeps max 20 entries', async () => {
    for (let i = 0; i < 25; i++) {
      mod.upsertProgress({ type: 'movie', id: i, pos: 100 + i })
    }
    expect(readStorage()).toHaveLength(20)
  })
})

describe('removeHistory', () => {
  beforeEach(async () => { await imp() })

  it('removes entry by type and id', async () => {
    mod.upsertProgress({ type: 'movie', id: 1, pos: 100 })
    mod.upsertProgress({ type: 'tv', id: 2, pos: 200 })
    expect(readStorage()).toHaveLength(2)

    mod.removeHistory('movie', 1)
    const stored = readStorage()
    expect(stored).toHaveLength(1)
    expect(stored[0].type).toBe('tv')
    expect(stored[0].id).toBe(2)
  })

  it('does nothing when entry does not exist', async () => {
    mod.removeHistory('movie', 999)
    expect(readStorage()).toHaveLength(0)
  })
})

describe('restorePosition', () => {
  beforeEach(async () => {
    await imp()
    mod.upsertProgress({ type: 'movie', id: 1, pos: 120 })
    mod.upsertProgress({ type: 'tv', id: 5, pos: 300, season: 1, episode: 3 })
  })

  it('returns position for matching movie entry', () => {
    expect(mod.restorePosition('movie', 1)).toBe(120)
  })

  it('returns 0 when no entry exists', () => {
    expect(mod.restorePosition('movie', 999)).toBe(0)
  })

  it('returns position for tv when season AND episode match', () => {
    expect(mod.restorePosition('tv', 5, 1, 3)).toBe(300)
  })

  it('returns 0 for tv when season does not match', () => {
    expect(mod.restorePosition('tv', 5, 2, 3)).toBe(0)
  })

  it('returns 0 for tv when episode does not match', () => {
    expect(mod.restorePosition('tv', 5, 1, 4)).toBe(0)
  })
})

describe('subscribe / getSnapshot', () => {
  beforeEach(async () => { await imp() })

  it('getSnapshot returns current history array', () => {
    expect(Array.isArray(mod.getSnapshot())).toBe(true)
  })

  it('subscribe calls listener on upsert', () => {
    const fn = vi.fn()
    const unsub = mod.subscribe(fn)

    mod.upsertProgress({ type: 'movie', id: 10, pos: 50 })
    expect(fn).toHaveBeenCalledTimes(1)

    unsub()
  })

  it('subscribe calls listener on remove', () => {
    mod.upsertProgress({ type: 'movie', id: 20, pos: 50 })

    const fn = vi.fn()
    mod.subscribe(fn)
    mod.removeHistory('movie', 20)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('unsubscribe removes listener', () => {
    const fn = vi.fn()
    const unsub = mod.subscribe(fn)
    unsub()

    mod.upsertProgress({ type: 'movie', id: 30, pos: 50 })
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('useHistory', () => {
  beforeEach(async () => { await imp() })

  it('returns entries via useSyncExternalStore', async () => {
    const { renderHook, act } = await import('@testing-library/react')
    mod.upsertProgress({ type: 'movie', id: 50, pos: 90 })
    const { result } = renderHook(() => mod.useHistory())
    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe(50)
  })

  it('rerenders when history changes', async () => {
    const { renderHook, act } = await import('@testing-library/react')
    // Start from clean state
    const { result } = renderHook(() => mod.useHistory())
    expect(result.current).toHaveLength(0)

    act(() => mod.upsertProgress({ type: 'movie', id: 60, pos: 80 }))
    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe(60)
  })
})