import { vi, describe, it, expect } from 'vitest'
import request from 'supertest'

// Mock fs so index.js loadCatalog returns test data in-memory
const testCatalog = [
  { id: '1', tmdb_id: 1, title: 'Published Movie', type: 'movie', status: 'published' },
  { id: '2', tmdb_id: 2, title: 'Published TV', type: 'tv', status: 'published' },
  { id: '3', tmdb_id: 3, title: 'Draft Entry', type: 'movie', status: 'draft' },
]

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: { ...actual, existsSync: () => true, readFileSync: () => JSON.stringify({ entries: testCatalog, sessions: [] }), writeFileSync: () => {} },
    existsSync: () => true,
    readFileSync: () => JSON.stringify({ entries: testCatalog, sessions: [] }),
    writeFileSync: () => {},
  }
})

process.env.TMDB_API_KEY = 'test-key'
process.env.PORT = '0'

const { app } = await import('../../server/index.js')

describe('catalog API', () => {
  it('GET /api/catalog — returns all entries', async () => {
    const res = await request(app).get('/api/catalog')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(3)
  })

  it('GET /api/catalog/:id — returns published entry', async () => {
    const res = await request(app).get('/api/catalog/1')
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Published Movie')
  })

  it('GET /api/catalog/:id — 404 for draft entry (status filter)', async () => {
    const res = await request(app).get('/api/catalog/3')
    expect(res.status).toBe(404)
  })

  it('GET /api/catalog/:id — 404 for missing id', async () => {
    const res = await request(app).get('/api/catalog/999')
    expect(res.status).toBe(404)
  })

  it('GET /api/catalog/lookup — finds by tmdb_id + type', async () => {
    const res = await request(app).get('/api/catalog/lookup?tmdb_id=1&type=movie')
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Published Movie')
  })

  it('GET /api/catalog/lookup — 404 for non-matching', async () => {
    const res = await request(app).get('/api/catalog/lookup?tmdb_id=999&type=movie')
    expect(res.status).toBe(404)
  })

  it('GET /api/catalog/lookup — 404 for draft entry', async () => {
    const res = await request(app).get('/api/catalog/lookup?tmdb_id=3&type=movie')
    expect(res.status).toBe(404)
  })
})