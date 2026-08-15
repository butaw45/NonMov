// ------------------------------------------------------------------
// Backend minimal Seluloid (PRD: opsi B)
// 1) Proxy TMDB: semua path /3/** diteruskan ke api.themoviedb.org
//    dengan API key dari env server (tidak pernah sampai ke browser).
// 2) Catalog JSON: /api/catalog menyajikan entri konten custom dari
//    server/catalog.json (edit manual, server tidak menghosting video).
// 3) Produksi: menyajikan hasil build Vite (dist/) sebagai static site.
//
// Jalankan dev : npm run dev   (load server/.env via --env-file)
// Jalankan prod: npm start     (butuh dist/ sudah di-build)
// ------------------------------------------------------------------

import express from 'express'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import adminRoutes from './adminRoutes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_KEY = (process.env.TMDB_API_KEY || '').trim()
const PORT = Number(process.env.PORT || 4001)
const TMDB = 'https://api.themoviedb.org/3'
const CATALOG_PATH = path.join(__dirname, 'catalog.json')

if (!API_KEY) {
  console.error('[seluloid] TMDB_API_KEY belum di-set. Isi server/.env dulu (lihat .env.example).')
  process.exit(1)
}

const app = express()
app.use(express.json())

// ---- Proxy TMDB -------------------------------------------------
// Frontend memanggil path yang sama seperti TMDB (/3/trending/all/day dsb).
// Query param dari client dipertahankan; api_key disisipkan di server.
app.all('/3/*', async (req, res) => {
  try {
    const subPath = req.params[0] ? '/' + req.params[0] : ''
    const url = new URL(TMDB + subPath)
    for (const [k, v] of Object.entries(req.query)) {
      if (k !== 'api_key') url.searchParams.set(k, String(v))
    }
    url.searchParams.set('api_key', API_KEY)

    const upstream = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })
    const body = await upstream.json()
    res.status(upstream.status).json(body)
  } catch (e) {
    res.status(502).json({ status_message: 'Upstream TMDB error', detail: String(e?.message || e) })
  }
})

// ---- Catalog JSON ----------------------------------------------
// Dibaca ulang tiap request: volume edit kecil, tidak perlu cache/watch.
// Backward compat: file lama = array langsung; format baru = { entries: [...], sessions: [...] }
function loadCatalog() {
  if (!existsSync(CATALOG_PATH)) return []
  try {
    const data = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'))
    if (Array.isArray(data)) return data
    return Array.isArray(data.entries) ? data.entries : []
  } catch (e) {
    console.error('[seluloid] catalog.json tidak valid:', e?.message || e)
    return []
  }
}

// GET /api/catalog — semua entri
app.get('/api/catalog', (req, res) => {
  res.json(loadCatalog())
})

// GET /api/catalog/lookup?tmdb_id=123&type=movie — cari by tmdb_id + type
// (Harus didaftarkan SEBELUM /api/catalog/:id supaya tidak ketangkap sebagai id "lookup")
app.get('/api/catalog/lookup', (req, res) => {
  const tmdbId = Number(req.query.tmdb_id)
  const type = String(req.query.type || '')
  const item = loadCatalog().find((c) => c.tmdb_id === tmdbId && c.type === type)
  if (!item) return res.status(404).json({ status_message: 'Not found' })
  res.json(item)
})

// GET /api/catalog/:id — satu entri by id internal
app.get('/api/catalog/:id', (req, res) => {
  const item = loadCatalog().find((c) => String(c.id) === req.params.id)
  if (!item) return res.status(404).json({ status_message: 'Not found' })
  res.json(item)
})

// ---- Admin API ----------------------------------------------------
app.use('/admin/api', adminRoutes)

// ---- Static build (produksi) ------------------------------------
const DIST = path.join(__dirname, '..', 'dist')
if (existsSync(DIST)) {
  app.use(express.static(DIST))
  // SPA fallback: semua route non-API kembali ke index.html
  app.get('/*', (req, res) => {
    res.sendFile(path.join(DIST, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`[seluloid] backend di http://localhost:${PORT}`)
  console.log('[seluloid] TMDB proxy   : /3/*')
  console.log('[seluloid] Catalog API  : /api/catalog')
  console.log('[seluloid] Admin API    : /admin/api/* (butuh ADMIN_PASS di .env)')
  if (existsSync(DIST)) console.log('[seluloid] Static site  : dist/ (produksi)')
})
