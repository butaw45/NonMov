import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { adminApi } from '../../src/lib/api'

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

function mockNetworkError() {
  return vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(200, { message: 'ok' }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('adminApi.login', () => {
  it('returns body on successful login', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { token: 'abc', user: { name: 'Admin' } }))
    const result = await adminApi.login('admin', 'secret')
    expect(result.token).toBe('abc')

    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/admin/api/login')
    expect(opts.method).toBe('POST')
    expect(opts.credentials).toBe('same-origin')
    expect(JSON.parse(opts.body)).toEqual({ username: 'admin', password: 'secret' })
  })

  it('throws on 401 (wrong credentials)', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { status_message: 'Invalid credentials' }))
    await expect(adminApi.login('admin', 'wrong')).rejects.toThrow('Invalid credentials')
  })

  it('throws without authExpired flag on login endpoint', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { status_message: 'Invalid' }))
    try {
      await adminApi.login('admin', 'wrong')
    } catch (e) {
      expect(e.authExpired).toBeUndefined()
      expect(e.message).toBe('Invalid')
    }
  })
})

describe('adminApi.logout', () => {
  it('sends POST to logout endpoint', async () => {
    await adminApi.logout()
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/admin/api/logout')
    expect(opts.method).toBe('POST')
  })
})

describe('adminApi.me', () => {
  it('returns current user', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { id: 1, name: 'Admin' }))
    const data = await adminApi.me()
    expect(fetch.mock.calls[0][0]).toBe('/admin/api/me')
    expect(data.name).toBe('Admin')
  })
})

describe('adminApi.getConfig / updateConfig', () => {
  it('getConfig fetches config', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { key: 'val' }))
    const data = await adminApi.getConfig()
    expect(fetch.mock.calls[0][0]).toBe('/admin/api/config')
    expect(data.key).toBe('val')
  })

  it('updateConfig sends PUT with JSON body', async () => {
    await adminApi.updateConfig({ maintenance: true })
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/admin/api/config')
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ maintenance: true })
  })
})

describe('adminApi.listEntries', () => {
  it('calls without status param', async () => {
    await adminApi.listEntries()
    expect(fetch.mock.calls[0][0]).toBe('/admin/api/entries')
  })

  it('applies status query param', async () => {
    await adminApi.listEntries('published')
    expect(fetch.mock.calls[0][0]).toContain('status=published')
  })
})

describe('adminApi.getEntry', () => {
  it('fetches entry by id', async () => {
    await adminApi.getEntry(42)
    expect(fetch.mock.calls[0][0]).toBe('/admin/api/entries/42')
  })
})

describe('adminApi.createEntry', () => {
  it('sends POST with entry data', async () => {
    vi.stubGlobal('fetch', mockFetch(201, { id: 1 }))
    const entry = { title: 'New Entry', type: 'movie' }
    const data = await adminApi.createEntry(entry)

    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/admin/api/entries')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual(entry)
    expect(data.id).toBe(1)
  })
})

describe('adminApi.updateEntry', () => {
  it('sends PUT with entry data', async () => {
    await adminApi.updateEntry(5, { title: 'Updated' })
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/admin/api/entries/5')
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ title: 'Updated' })
  })
})

describe('adminApi.deleteEntry', () => {
  it('sends DELETE to entry endpoint', async () => {
    await adminApi.deleteEntry(3)
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/admin/api/entries/3')
    expect(opts.method).toBe('DELETE')
  })
})

describe('adminApi.match', () => {
  it('sends POST with query and type', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { results: [] }))
    const data = await adminApi.match('batman', 'movie')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/admin/api/match')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ query: 'batman', type: 'movie' })
    expect(data.results).toEqual([])
  })
})

describe('adminApi — 401 on non-login endpoints', () => {
  it('sets authExpired flag on 401 from listEntries', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { status_message: 'Session expired' }))
    try {
      await adminApi.listEntries()
    } catch (e) {
      expect(e.authExpired).toBe(true)
      expect(e.message).toBe('Session expired')
    }
  })

  it('sets authExpired flag on 401 from getEntry', async () => {
    vi.stubGlobal('fetch', mockFetch(401, {}))
    try {
      await adminApi.getEntry(1)
    } catch (e) {
      expect(e.authExpired).toBe(true)
    }
  })
})

describe('adminApi — network error', () => {
  it('throws descriptive error on network failure', async () => {
    vi.stubGlobal('fetch', mockNetworkError())
    await expect(adminApi.me()).rejects.toThrow('Backend tidak bisa dihubungi. Pastikan server jalan.')
  })

  it('throws descriptive error on createEntry network failure', async () => {
    vi.stubGlobal('fetch', mockNetworkError())
    await expect(adminApi.createEntry({})).rejects.toThrow('Backend tidak bisa dihubungi. Pastikan server jalan.')
  })
})

describe('adminApi — non-JSON response', () => {
  it('handles response without JSON body', async () => {
    const fn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('no body')),
    })
    vi.stubGlobal('fetch', fn)
    const result = await adminApi.logout()
    expect(result).toBeNull()
  })
})

describe('adminApi — non-ok without body JSON', () => {
  it('falls back to HTTP status message', async () => {
    const fn = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('no body')),
    })
    vi.stubGlobal('fetch', fn)
    await expect(adminApi.me()).rejects.toThrow('HTTP 500')
  })
})