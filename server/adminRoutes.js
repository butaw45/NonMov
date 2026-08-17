// ------------------------------------------------------------------
// Admin routes Seluloid (Issue #6)
// Auth sederhana: session cookie setelah login, validasi via middleware.
// Semua route /admin/api/* diproteksi kecuali login.
// ------------------------------------------------------------------

import { Router } from 'express'
import {
  verifyCredentials,
  createSession,
  validateSession,
  destroySession,
  sessionTimeoutMs,
  listEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  searchTMDB,
  fetchTMDBTitle,
} from './admin.js'
import { getConfig, updateConfig } from './config.js'

const router = Router()

// ---- Middleware ----------------------------------------------------

function getCookie(req, name) {
  const header = req.headers.cookie || ''
  for (const pair of header.split(';')) {
    const [k, ...rest] = pair.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

function protectRoute(req, res, next) {
  const token = getCookie(req, 'admin_session')
  if (!validateSession(token)) {
    return res.status(401).json({ status_message: 'Sesi tidak valid atau sudah berakhir' })
  }
  next()
}

// ---- Auth routes ---------------------------------------------------

// POST /admin/api/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ status_message: 'Username dan password wajib diisi' })
  }
  if (!verifyCredentials(username, password)) {
    return res.status(401).json({ status_message: 'Username atau password salah' })
  }
  const token = createSession()
  const secure = process.env.NODE_ENV === 'production'
  res.setHeader(
    'Set-Cookie',
    `admin_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(sessionTimeoutMs() / 1000)}${secure ? '; Secure' : ''}`
  )
  res.json({ ok: true })
})

// POST /admin/api/logout
router.post('/logout', (req, res) => {
  const token = getCookie(req, 'admin_session')
  if (token) destroySession(token)
  res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
  res.json({ ok: true })
})

// GET /admin/api/me — cek sesi (dipakai frontend untuk proteksi route)
router.get('/me', protectRoute, (req, res) => {
  res.json({ ok: true })
})

// ---- CRUD entries ----------------------------------------------------

// GET /admin/api/entries?status=draft|published
router.get('/entries', protectRoute, (req, res) => {
  const status = req.query.status
  if (status && !['draft', 'published'].includes(status)) {
    return res.status(400).json({ status_message: 'status harus draft atau published' })
  }
  res.json(listEntries(status))
})

// POST /admin/api/entries
router.post('/entries', protectRoute, async (req, res) => {
  try {
    const body = req.body || {}
    // Auto-fill title dari TMDB jika kosong
    if (!body.title && body.tmdb_id && body.type) {
      body.title = await fetchTMDBTitle(body.tmdb_id, body.type)
    }
    const entry = createEntry(body)
    res.status(201).json(entry)
  } catch (e) {
    const msg = e?.message || 'Unknown error'
    if (msg.includes('sudah ada')) return res.status(409).json({ status_message: msg })
    if (msg.includes('harus')) return res.status(400).json({ status_message: msg })
    res.status(500).json({ status_message: msg })
  }
})

// GET /admin/api/entries/:id
router.get('/entries/:id', protectRoute, (req, res) => {
  const entry = getEntryById(req.params.id)
  if (!entry) return res.status(404).json({ status_message: 'Entry tidak ditemukan' })
  res.json(entry)
})

// PUT /admin/api/entries/:id
router.put('/entries/:id', protectRoute, (req, res) => {
  try {
    const updated = updateEntry(req.params.id, req.body || {})
    if (!updated) return res.status(404).json({ status_message: 'Entry tidak ditemukan' })
    res.json(updated)
  } catch (e) {
    res.status(400).json({ status_message: e?.message || 'Unknown error' })
  }
})

// DELETE /admin/api/entries/:id
router.delete('/entries/:id', protectRoute, (req, res) => {
  const ok = deleteEntry(req.params.id)
  if (!ok) return res.status(404).json({ status_message: 'Entry tidak ditemukan' })
})

// ---- Config global --------------------------------------------------

// GET /admin/api/config
router.get('/config', protectRoute, (req, res) => {
  res.json(getConfig())
})

// PUT /admin/api/config
router.put('/config', protectRoute, (req, res) => {
  try {
    res.json(updateConfig(req.body || {}))
  } catch (err) {
    res.status(400).json({ status_message: err.message })
  }
})

// ---- TMDB match ------------------------------------------------------

// POST /admin/api/match { query, type? }
router.post('/match', protectRoute, async (req, res) => {
  try {
    const { query, type } = req.body || {}
    if (!query) return res.status(400).json({ status_message: 'query wajib diisi' })
    const results = await searchTMDB(query, type)
    res.json(results)
  } catch (e) {
    res.status(e.status || 502).json({ status_message: e?.message || 'Gagal konek ke TMDB' })
  }
})

export default router
