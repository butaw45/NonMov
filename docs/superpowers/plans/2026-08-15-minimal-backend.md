# Minimal Backend (Proxy TMDB + Catalog JSON) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah backend minimal Node + Express yang mem-proxy request TMDB dan menyajikan katalog JSON untuk konten custom, sehingga API key TMDB tidak terekspos di browser dan entri custom bisa diputar di player.

**Architecture:** Backend `server/` menjalankan 2 hal: (1) proxy semua path `/3/**` ke TMDB dengan API key dari env, (2) sajikan `GET /api/catalog` (dan lookup) dari `server/catalog.json`. Frontend `src/lib/tmdb.js` mengganti base URL jadi bisa mengarah ke backend saat produksi. Vite dev-server mem-proxy `/api` (dan opsional `/3`) ke backend agar dev tanpa setup tetap jalan.

**Tech Stack:** Node 20+, Express 4, file JSON (tanpa database), ArtPlayer + HLS.js tetap seperti sekarang. Node 20+ memakai `fetch` global bawaan, tidak perlu `node-fetch`.

## Global Constraints

- Backend TIDAK menghosting video — `video_url` tetap menunjuk ke HLS/DASH eksternal (Bunny/CF Stream/dll).
- Kunci TMDB HARUS tersembunyi dari browser di produksi (env di backend, bukan `.env` Vite).
- Tanpa auth/admin panel di fase ini — `catalog.json` diedit manual lalu restart backend.
- Frontend existing HARUS tetap jalan: jika entri custom tidak ada, fallback ke watch-providers TMDB seperti sebelumnya.
- File baru di `server/` dan `docs/superpowers/plans/`; `.env` backend tidak boleh ter-stage.
- Semua commit pesan Indonesia (`feat:`, `fix:`, `docs:`).

---

### Task 1: Scaffold backend server

**Files:**
- Create: `server/index.js`
- Create: `server/package.json`
- Modify: `.gitignore` (tambahkan `server/.env`, `server/node_modules/`)

**Interfaces:**
- Consumes: `process.env.TMDB_API_KEY`, `process.env.PORT`
- Produces: express app dengan route `GET /3/*` (proxy TMDB), `GET /api/catalog`, `GET /api/catalog/:id`, static `/dist` untuk produksi

- [ ] **Step 1: Write server/package.json**

```json
{
  "name": "seluloid-server",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "express": "^4.21.0"
  }
}
```

- [ ] **Step 2: Write server/index.js**

```js
import express from 'express'
import fetch from 'node-fetch'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_KEY = process.env.TMDB_API_KEY?.trim()
const PORT = Number(process.env.PORT || 4001)
const TMDB = 'https://api.themoviedb.org/3'
const CATALOG_PATH = path.join(__dirname, 'catalog.json')

if (!API_KEY) {
  console.error('TMDB_API_KEY belum di-set di server/.env')
  process.exit(1)
}

const app = express()
app.use(express.json())

// Proxy TMDB — terima path setelah /3, terus api_key dari backend
app.all('/3/*', async (req, res) => {
  try {
    const url = new URL(req.originalUrl.replace(/^\/3/, ''), TMDB)
    // Pertahankan query param yang ada, tambahkan api_key
    url.searchParams.set('api_key', API_KEY)
    const upstream = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })
    const body = await upstream.json()
    res.status(upstream.status).json(body)
  } catch (e) {
    res.status(502).json({ status_message: 'Upstream TMDB error', detail: e.message })
  }
})

// Load catalog — cache di memori, reload otomatis saat file berubah (simple: tiap request baca file; untuk volume kecil oke)
function loadCatalog() {
  if (!existsSync(CATALOG_PATH)) return []
  try {
    return JSON.parse(readFileSync(CATALOG_PATH, 'utf8'))
  } catch {
    return []
  }
}

// GET /api/catalog — semua entri
app.get('/api/catalog', (req, res) => {
  res.json(loadCatalog())
})

// GET /api/catalog/:id — satu entri
app.get('/api/catalog/:id', (req, res) => {
  const all = loadCatalog()
  const item = all.find((c) => String(c.id) === req.params.id)
  if (!item) return res.status(404).json({ status_message: 'Not found' })
  res.json(item)
})

// GET /api/catalog/lookup?tmdb_id=123&type=movie — cari by tmdb_id + type
app.get('/api/catalog/lookup', (req, res) => {
  const tmdb_id = Number(req.query.tmdb_id)
  const type = String(req.query.type || '')
  const all = loadCatalog()
  const item = all.find((c) => c.tmdb_id === tmdb_id && c.type === type)
  if (!item) return res.status(404).json({ status_message: 'Not found' })
  res.json(item)
})

// Di produksi, sajikan static build Vite
const DIST = path.join(__dirname, '..', 'dist')
if (existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`[seluloid] backend di http://localhost:${PORT}`)
  console.log(`[seluloid] TMDB proxy: /3/*`)
  console.log(`[seluloid] Catalog API: /api/catalog`)
})
```

> Catatan: `node-fetch` perlu diinstall untuk Node < 20. Kalau project menjalankan Node 20+, bisa dihapus dan pakai `fetch` global. Pastikan Node versi sesuai.

- [ ] **Step 3: Add server/.env.example**

```
TMDB_API_KEY=isi_key_tmdb_kamu
PORT=4001
```

- [ ] **Step 4: Update .gitignore**

Tambahkan:
```
server/.env
server/node_modules/
```

- [ ] **Step 5: Install & run smoke test (manual)**

```bash
cd server && npm install
cp .env.example .env   # isi TMDB_API_KEY
npm run dev
```

Expected: server start, `curl http://localhost:4001/3/trending/all/day?api_key=...` return JSON TMDB. `curl /api/catalog` return `[]`.

- [ ] **Step 6: Commit**

```bash
git add server/ .gitignore
git commit -m "feat: scaffold backend proxy TMDB + catalog API"
```

---

### Task 2: Seed catalog schema + contoh

**Files:**
- Create: `server/catalog.json`
- Modify: `README.md` (tambahkan catatan lokasi dan format catalog)

**Interfaces:**
- Consumes: ditulis manual/diedit sesuai kebutuhan
- Produces: struktur JSON yang dibaca `/api/catalog` dan `/api/catalog/lookup`

- [ ] **Step 1: Write server/catalog.json**

```json
[
  {
    "id": 1,
    "tmdb_id": 550,
    "type": "movie",
    "title": "Fight Club",
    "video_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    "added_at": "2026-08-15"
  },
  {
    "id": 2,
    "tmdb_id": 1399,
    "type": "tv",
    "title": "Game of Thrones",
    "video_url": null,
    "episodes": [
      {
        "season": 1,
        "episode": 1,
        "title": "Winter Is Coming",
        "video_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ],
    "added_at": "2026-08-15"
  }
]
```

> Catatan: `id` adalah integer unik internal (bukan TMDB id), `tmdb_id` adalah id dari TMDB untuk matching, `episodes` opsional untuk TV.

- [ ] **Step 2: Update README.md**

Tambahkan di bagian "Menjalankan":
```markdown
## Backend (opsional untuk produksi)

Backend minimal untuk proxy TMDB + katalog custom.

```bash
cd server
npm install
cp .env.example .env   # isi TMDB_API_KEY
npm run dev            # http://localhost:4001
```

File katalog: `server/catalog.json`. Format lihat file.
```

- [ ] **Step 3: Commit**

```bash
git add server/catalog.json README.md
git commit -m "feat: tambah seed catalog JSON dan dokumentasi backend"
```

---

### Task 3: Frontend base URL config

**Files:**
- Modify: `src/lib/tmdb.js` (ubah `BASE` jadi env-driven)

**Interfaces:**
- Consumes: `import.meta.env.VITE_API_BASE`
- Produces: semua request TMDB kini mengarah ke `VITE_API_BASE` (default: `https://api.themoviedb.org/3`)

- [ ] **Step 1: Ubah BASE di src/lib/tmdb.js**

```js
// Sebelum:
// const BASE = 'https://api.themoviedb.org/3'

// Sesudah:
const BASE = (import.meta.env.VITE_API_BASE || 'https://api.themoviedb.org/3').replace(/\/+$/, '')
```

- [ ] **Step 2: Verify (manual)**

- [ ] **Step 3: Commit**

```bash
git add src/lib/tmdb.js
git commit -m "feat: tmdb.js base URL bisa diubah via VITE_API_BASE"
```

---

### Task 4: Vite dev proxy

**Files:**
- Modify: `vite.config.js`

**Interfaces:**
- Produces: `/api` dan opsional `/3` di-proxy ke backend saat `npm run dev`, tanpa mengubah kode frontend

- [ ] **Step 1: Tambah proxy di vite.config.js**

```js
server: {
  port: 5173,
  proxy: {
    '/api': 'http://localhost:4001',
    '/3': 'http://localhost:4001',
  },
},
```

> Dengan ini, di dev frontend bisa tetap memanggil `/3/...` dan `/api/...` dan Vite meneruskan ke backend. Jika backend tidak berjalan, fitur catalog akan 404 tapi metadata TMDB tetap lewat backend.

- [ ] **Step 2: Smoke test manual**

Jalankan `npm run dev` + `npm run dev` (di folder `server`) lalu buka browser. Pastikan Home/Browse masih memuat data TMDB.

- [ ] **Step 3: Commit**

```bash
git add vite.config.js
git commit -m "feat: proxy Vite dev ke backend untuk /api dan /3"
```

---

### Task 5: Watch page — resolve video dari catalog

**Files:**
- Modify: `src/pages/Watch.jsx`
- Modify: `src/lib/tmdb.js` (tambahkan helper `fetchCatalogLookup`)

**Interfaces:**
- Consumes: `tmdb_id`, `type` dari route, `GET /api/catalog/lookup`
- Produces: jika entri custom ditemukan, `src` otomatis terisi dari `video_url` atau episode; jika tidak, perilaku lama (butuh `?src=` manual) tetap jalan

- [ ] **Step 1: Tambah helper di src/lib/tmdb.js**

```js
export async function catalogLookup(tmdbId, type) {
  const base = (import.meta.env.VITE_API_BASE || 'https://api.themoviedb.org/3').replace(/\/+$/, '')
  const isLocal = base.includes('localhost') || base.includes('127.0.0.1')
  // Di dev lewat proxy Vite, atau produksi lewat backend
  const apiBase = isLocal ? '' : base
  const url = `/api/catalog/lookup?tmdb_id=${tmdbId}&type=${type}`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
```

> Catatan: di dev `VITE_API_BASE` mungkin di-set ke TMDB direct untuk metadata, tapi `/api/catalog/lookup` tetap lewat Vite proxy. Jadi fetch relatif `/api/...` cukup.

- [ ] **Step 2: Modifikasi Watch.jsx — load catalog saat mount**

Di bagian useEffect yang memuat detail, tambahkan efek terpisah untuk catalog:

```js
const [catalogEntry, setCatalogEntry] = useState(null)

useEffect(() => {
  if (!kind || !id) return
  // Jika sudah ada ?src= query, tidak perlu lookup catalog
  if (src) { setCatalogEntry(null); return }
  let on = true
  catalogLookup(Number(id), kind)
    .then((d) => { if (on) setCatalogEntry(d || null) })
    .catch(() => { if (on) setCatalogEntry(null) })
  return () => { on = false }
}, [kind, id, src])
```

- [ ] **Step 3: Modifikasi Watch.jsx — gunakan catalogEntry sebagai fallback src**

Di bagian inisialisasi player (`useEffect` terkait `src` atau saat build config player), ganti:

```js
const resolvedSrc = src || catalogEntry?.video_url || null
```

Untuk TV dengan episode, jika `src` tidak ada dan ada episode yang cocok dengan `season`/`episode`:

```js
const epEntry = kind === 'tv'
  ? catalogEntry?.episodes?.find((e) => e.season === season && e.episode === episode)
  : null
const resolvedSrc = src || epEntry?.video_url || catalogEntry?.video_url || null
```

- [ ] **Step 4: Tampilkan info entri custom (opsional)**

Jika `catalogEntry` ada, tampilkan badge kecil "Konten custom" di atas player.

- [ ] **Step 5: Smoke test manual**

- Tambah entri di `server/catalog.json` dengan `tmdb_id` dan `video_url` yang valid.
- Buka `/tonton/movie/{id}` tanpa `?src=` — player otomatis load dari catalog.
- Hapus entri — kembali ke perilaku lama (butuh `?src=` atau provider link).

- [ ] **Step 6: Commit**

```bash
git add src/pages/Watch.jsx src/lib/tmdb.js
git commit -m "feat: Watch page otomatis resolve video dari catalog custom"
```

---

### Task 6: Backend sajikan frontend build (produksi)

**Files:**
- Modify: `server/index.js` (tambahkan static middleware untuk `/dist`)
- Modify: `package.json` root (opsional: tambah script `start`)

> Sudah ada di Task 1 (`app.use(express.static(DIST))`). Verifikasi saja path dan script.

- [ ] **Step 1: Tambah script di package.json root (opsional)**

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "start": "cd server && npm start"
}
```

> Opsional — kalau kamu ingin `npm run start` di root langsung jalan backend + frontend build sudah ada di `dist/`.

- [ ] **Step 2: Commit (jika ada perubahan)**

```bash
git add package.json
git commit -m "docs: tambah script start untuk produksi"
```

---

### Task 7: Update README & AGENTS.md

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md` (tambahkan catatan menjalankan backend)

- [ ] **Step 1: Update README.md**

Tambahkan bagian:
```markdown
### Backend (proxy + catalog)

Backend minimal dijalankan dengan:
\`\`\`bash
cd server
npm install
cp .env.example .env
npm run dev
\`\`\`
```

- [ ] **Step 2: Update AGENTS.md**

Tambahkan di bagian Struktur:
```markdown
- `server/` — backend Express (proxy TMDB, catalog JSON)
- `server/catalog.json` — entri konten custom
```

- [ ] **Step 3: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: dokumentasi menjalankan backend dan struktur server"
```

---

## Dependencies matrix

| Package | Versi saat ini | Versi setelah | Alasan |
|---|---|---|---|
| `express` | — | `^4.21.0` | routing + static + error handling backend |

> Alternatif zero-dep: ganti Express dengan `http` module + `fetch` manual jika ingin tanpa dependency. Rasio manfaat/kasus untuk app kecil ini, Express tetap worth it.

## Re-index knowledge graph (setelah implementasi)

```bash
# Jalankan setelah setiap task yang mengubah file sumber
codebase-memory-mcp index_repository(repo_path="<root>", mode="moderate")
```

## Validasi akhir

1. `cd server && npm install && npm run dev` — backend up.
2. `npm run dev` (root) — frontend up, Home/Browse/Search/Detail/Watch memuat metadata.
3. Tambah 1 entri di `server/catalog.json`, buka `/tonton/{type}/{tmdb_id}` — player auto-load.
4. `npm run build` — build sukses.
5. `cd server && npm start` (dengan `dist/` sudah ada) — halaman statis ter-serve.

## Risiko & mitigasi

| Risiko | Prob | Impact | Mitigasi |
|---|---|---|---|
| Node versi < 20, `fetch` undefined di server | Sedang | Proxy TMDB broken | Tambah `node-fetch` atau naikkan Node floor di README |
| `catalog.json` berubah saat server jalan (race) | Rendah | Stale data | Untuk fase ini volume edit kecil; reload manual cukup |
| Vite proxy tidak match di browser (CORS) | Rendah | Frontend 404 | Pastikan base URL frontend konsisten (relatif `/3` lewat proxy atau env) |
