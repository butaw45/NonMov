import { vi, describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'

// --- Mocks must be hoisted before any imports ---

// Mock admin.js so CRUD ops use in-memory store (no filesystem)
let memStore = { entries: [], sessions: [] }

vi.mock('../../server/admin.js', () => {
  let idCounter = 99
  return {
    verifyCredentials: vi.fn((u, p) => u === 'admin' && p === 'secret'),
    createSession: vi.fn(() => {
      const tok = 'sess_' + Math.random().toString(36).slice(2)
      memStore.sessions.push({ token: tok, created_at: new Date().toISOString() })
      return tok
    }),
    validateSession: vi.fn((tok) => {
      if (!tok) return false
      return memStore.sessions.some((s) => s.token === tok)
    }),
    destroySession: vi.fn((tok) => {
      memStore.sessions = memStore.sessions.filter((s) => s.token !== tok)
    }),
    sessionTimeoutMs: vi.fn(() => 24 * 3600 * 1000),
    listEntries: vi.fn((status) => {
      if (!status) return [...memStore.entries]
      return memStore.entries.filter((e) => e.status === status)
    }),
    getEntryById: vi.fn((id) => memStore.entries.find((e) => String(e.id) === String(id)) || null),
    createEntry: vi.fn((data) => {
      if (!['movie', 'tv'].includes(data.type)) throw new Error('type harus movie atau tv')
      const tid = Number(data.tmdb_id)
      if (!Number.isInteger(tid) || tid <= 0) throw new Error('tmdb_id harus integer positif')
      if (memStore.entries.some((e) => e.tmdb_id === tid && e.type === data.type)) {
        throw new Error(`Entry untuk TMDB ID ${tid} (${data.type}) sudah ada`)
      }
      const entry = {
        id: String(++idCounter),
        ...data,
        tmdb_id: tid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      memStore.entries.push(entry)
      return entry
    }),
    updateEntry: vi.fn((id, patch) => {
      const idx = memStore.entries.findIndex((e) => String(e.id) === String(id))
      if (idx === -1) return null
      memStore.entries[idx] = { ...memStore.entries[idx], ...patch, updated_at: new Date().toISOString() }
      return memStore.entries[idx]
    }),
    deleteEntry: vi.fn((id) => {
      const before = memStore.entries.length
      memStore.entries = memStore.entries.filter((e) => String(e.id) !== String(id))
      return memStore.entries.length < before
    }),
    searchTMDB: vi.fn(async (query) => {
      if (!query) return []
      return [{ id: 1, title: 'Found Movie', type: 'movie', year: '2024' }]
    }),
    fetchTMDBTitle: vi.fn(async () => 'Fetched Title'),
  }
})

// Mock config too (it reads config.json from disk)
vi.mock('../../server/config.js', () => ({
  getConfig: vi.fn(() => ({ providers: [] })),
  updateConfig: vi.fn((patch) => patch),
}))

// --- Set env before module import ---
process.env.TMDB_API_KEY = 'test-key'
process.env.ADMIN_PASS = 'secret'
process.env.ADMIN_USER = 'admin'
process.env.PORT = '0'

const { app } = await import('../../server/index.js')

describe('adminRoutes', () => {
  beforeEach(() => {
    memStore = { entries: [], sessions: [] }
    vi.clearAllMocks()
  })

  // ---- Auth ----

  it('POST /login — 400 when body missing', async () => {
    const res = await request(app).post('/admin/api/login').send({})
    expect(res.status).toBe(400)
    expect(res.body.status_message).toMatch(/wajib/i)
  })

  it('POST /login — 401 on wrong creds', async () => {
    const res = await request(app).post('/admin/api/login').send({ username: 'x', password: 'y' })
    expect(res.status).toBe(401)
    expect(res.body.status_message).toMatch(/salah/i)
  })

  it('POST /login — 200 and sets cookie', async () => {
    const res = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('POST /logout — clears cookie', async () => {
    // Login first
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const res = await request(app).post('/admin/api/logout').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('GET /me — 401 without session', async () => {
    const res = await request(app).get('/admin/api/me')
    expect(res.status).toBe(401)
  })

  it('GET /me — 200 with session', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const res = await request(app).get('/admin/api/me').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  // ---- CRUD entries ----

  it('GET /entries — 401 without session', async () => {
    const res = await request(app).get('/admin/api/entries')
    expect(res.status).toBe(401)
  })

  it('GET /entries — empty list', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const res = await request(app).get('/admin/api/entries').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('GET /entries — 400 for bad status param', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const res = await request(app).get('/admin/api/entries?status=invalid').set('Cookie', cookie)
    expect(res.status).toBe(400)
  })

  it('POST /entries — 201 created', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const res = await request(app)
      .post('/admin/api/entries')
      .set('Cookie', cookie)
      .send({ type: 'movie', tmdb_id: 100, title: 'New', video_url: 'https://example.com/p.m3u8' })
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('New')
    expect(res.body.tmdb_id).toBe(100)
  })

  it('POST /entries — 400 validation', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const res = await request(app)
      .post('/admin/api/entries')
      .set('Cookie', cookie)
      .send({ type: 'book', tmdb_id: 1 })
    expect(res.status).toBe(400)
  })

  it('POST /entries — 409 duplicate', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    await request(app).post('/admin/api/entries').set('Cookie', cookie).send({ type: 'movie', tmdb_id: 100, title: 'A', video_url: 'https://a.com/p.m3u8' })
    const res = await request(app).post('/admin/api/entries').set('Cookie', cookie).send({ type: 'movie', tmdb_id: 100, title: 'B', video_url: 'https://b.com/p.m3u8' })
    expect(res.status).toBe(409)
  })

  it('GET /entries/:id — 200', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const created = await request(app).post('/admin/api/entries').set('Cookie', cookie).send({ type: 'movie', tmdb_id: 200, title: 'GetMe', video_url: 'https://e.com/p.m3u8' })
    const res = await request(app).get(`/admin/api/entries/${created.body.id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('GetMe')
  })

  it('GET /entries/:id — 404', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const res = await request(app).get('/admin/api/entries/999').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('PUT /entries/:id — 200', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const created = await request(app).post('/admin/api/entries').set('Cookie', cookie).send({ type: 'movie', tmdb_id: 300, title: 'Updatable', video_url: 'https://e.com/p.m3u8' })
    const res = await request(app).put(`/admin/api/entries/${created.body.id}`).set('Cookie', cookie).send({ title: 'Updated' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Updated')
  })

  it('PUT /entries/:id — 404', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const res = await request(app).put('/admin/api/entries/999').set('Cookie', cookie).send({ title: 'Nope' })
    expect(res.status).toBe(404)
  })

  it('DELETE /entries/:id — 200', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const created = await request(app).post('/admin/api/entries').set('Cookie', cookie).send({ type: 'movie', tmdb_id: 400, title: 'Deletable', video_url: 'https://e.com/p.m3u8' })
    const res = await request(app).delete(`/admin/api/entries/${created.body.id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('DELETE /entries/:id — 404', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const res = await request(app).delete('/admin/api/entries/999').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  // ---- Config ----

  it('GET /config — 401 without session', async () => {
    const res = await request(app).get('/admin/api/config')
    expect(res.status).toBe(401)
  })

  it('GET /config — 200 with session', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const res = await request(app).get('/admin/api/config').set('Cookie', cookie)
    expect(res.status).toBe(200)
  })

  it('PUT /config — 200', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const res = await request(app).put('/admin/api/config').set('Cookie', cookie).send({ providers: [] })
    expect(res.status).toBe(200)
  })

  // ---- TMDB match ----

  it('POST /match — 400 empty query', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const res = await request(app).post('/admin/api/match').set('Cookie', cookie).send({ query: '' })
    expect(res.status).toBe(400)
  })

  it('POST /match — 200', async () => {
    const login = await request(app).post('/admin/api/login').send({ username: 'admin', password: 'secret' })
    const cookie = login.headers['set-cookie']
    const res = await request(app).post('/admin/api/match').set('Cookie', cookie).send({ query: 'test' })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})