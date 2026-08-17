# TMDB Backend Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah cache in-memory di proxy TMDB backend (`server/index.js`) — hemat hit API + turunkan latency, TTL 2 kelas, tanpa dependency/Redis/rate-limiter.

**Architecture:** Map in-memory `key → { t, data }` di handler `/3/*`. Hit bila `Date.now() - t < ttlFor(subPath)`; miss → fetch TMDB → simpan (evict LRU bila penuh) → return. Header custom `res-cache: HIT|MISS` untuk verifikasi. TTL dinamis 600s (search/trending/popular/top_rated/upcoming/now_playing), statis 86400s (lainnya).

**Tech Stack:** Node.js (native `fetch`, `Map`). Tanpa dependency baru.

## Global Constraints

- Single instance, in-memory only — TANPA Redis, TANPA rate limiter, TANPA SWR, TANPA background job.
- Hanya sentuh `server/index.js`. Jangan ubah `src/lib/tmdb.js`, catalog, admin, watchlist, history.
- TTL: dinamis `600` (detik), statis `86400` (detik).
- `MAX_ENTRIES = 500`; evict entri tertua saat penuh (Map insertion order).
- 404/401/502 TIDAK dicache — perilaku error tidak berubah.
- `api_key` tidak boleh jadi bagian key cache (disisipkan server-side, konstan).
- Ponytail: ~15 baris inti, helper inline di `server/index.js`, jangan buat modul cache terpisah.

---

### Task 1: Cache in-memory di proxy `/3/*`

**Files:**
- Modify: `server/index.js:34-54` (blok `// ---- Proxy TMDB ----`)

**Interfaces:**
- Produces: helper `ttlFor(subPath) → number`, konstanta `DYNAMIC_TTL`, `STATIC_TTL`, `MAX_ENTRIES`, `Map semantics` (key → `{ t, data }`). Semua scope module-private (tak diekspor).

- [ ] **Step 1: Baca blok proxy aktual untuk konteks presisi**

Baca `server/index.js:34-54`. Konfirmasi nama variabel: `API_KEY`, `TMDB`, `subPath`, `res`, `req`. (Patuhi struktur existing — jangan restructure.)

- [ ] **Step 2: Tambah konstanta & Map di atas blok proxy**

Setelah `const CATALOG_PATH = ...` (sekitar baris 25), tambah:

```js
// ---- Cache TMDB (in-memory, TTL 2 kelas) ---------------------
// Endpoint dinamis (search/trending/dsb.) TTL pendek; statis TTL panjang.
// TANPA redis/rate-limiter/SWR: skala demo, klien sudah punya sessionStorage cache.
const DYNAMIC_TTL = 600            // 10 menit
const STATIC_TTL = 86400           // 24 jam
const MAX_ENTRIES = 500
const DYNAMIC_TOKENS = ['/search/', '/trending/', '/popular', '/top_rated', '/upcoming', '/now_playing']

function ttlFor(subPath) {
  return DYNAMIC_TOKENS.some((t) => subPath.includes(t)) ? DYNAMIC_TTL : STATIC_TTL
}

const tmdbCache = new Map() // key -> { t, data }
```

- [ ] **Step 3: Ubah handler proxy agar pakai cache**

Ganti isi `app.all('/3/*', ...)` (baris 37-54) menjadi:

```js
app.all('/3/*', async (req, res) => {
  try {
    const subPath = req.params[0] ? '/' + req.params[0] : ''
    const url = new URL(TMDB + subPath)
    for (const [k, v] of Object.entries(req.query)) {
      if (k !== 'api_key') url.searchParams.set(k, String(v))
    }
    url.searchParams.set('api_key', API_KEY)

    // Cache lookup — api_key TIDAK masuk key (konstan server-side).
    const cacheKey = subPath + '?' + url.searchParams.toString().replace(/api_key=[^&]*&?/, '')
    const ttl = ttlFor(subPath)
    const hit = tmdbCache.get(cacheKey)
    if (hit && Date.now() - hit.t < ttl) {
      res.setHeader('res-cache', 'HIT')
      return res.json(hit.data)
    }

    const upstream = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })
    const body = await upstream.json()

    // Hanya cache respons sukses (2xx). 404/401/502 tetap diteruskan tanpa cache.
    if (upstream.ok) {
      if (!tmdbCache.has(cacheKey) && tmdbCache.size >= MAX_ENTRIES) {
        tmdbCache.delete(tmdbCache.keys().next().value) // evict LRU (entri tertua)
      }
      tmdbCache.set(cacheKey, { t: Date.now(), data: body })
      res.setHeader('res-cache', 'MISS')
    }
    res.status(upstream.status).json(body)
  } catch (e) {
    res.status(502).json({ status_message: 'Upstream TMDB error', detail: String(e?.message || e) })
  }
})
```

Catatan: `res.status(upstream.status).json(body)` mempertahankan perilaku lama
(yang sudah persis begitu) — hanya kini wajib men-set status sebelum/bersama
response, dan respons non-2xx (404/401) tidak ditulis ke cache. Kontrak error
tidak berubah: 401/404 terusa dengan status upstream masing-masing, 502 dari
`catch` tetap.

- [ ] **Step 4: Verifikasi syntax**

Run: `node --check server/index.js`
Expected: exit 0, tidak ada output.

- [ ] **Step 5: Full build (repo sehat)**

Run: `npm run build` (di root)
Expected: build sukses, 0 error (perubahan murni server — bundle frontend tak terpengaruh).

- [ ] **Step 6: Smoke test cache**

Backend perlu `server/.env` punya `TMDB_API_KEY` valid. Jalankan backend sementara:

```bash
cd server && node --env-file=.env index.js &   # atau lewat npm run dev
```

Lalu (dari terminal kedua, di root):

```bash
curl -s -D - -o /dev/null "http://localhost:4001/3/trending/movie/day" -H "Accept: application/json" | grep -i res-cache   # MISS
curl -s -D - -o /dev/null "http://localhost:4001/3/trending/movie/day" -H "Accept: application/json" | grep -i res-cache   # HIT
curl -s -o NUL "http://localhost:4001/3/movie/0" -w "%{http_code}\n"     # 404
curl -s -D - -o /dev/null "http://localhost:4001/3/movie/0" -H "Accept: application/json" | grep -i res-cache   # MISS lagi (404 tak dicache)
```

Expected: request pertama `res-cache: MISS`, kedua `res-cache: HIT`; `/3/movie/0` → `404` dua kali, header `res-cache` TIDAK muncul (atau MISS) — 404 tidak pernah dicache. Hentikan backend setelah test.

- [ ] **Step 7: Commit** (konfirmasi user dulu — repo rule 4)

```bash
git add server/index.js
git commit -m "feat: cache TMDB backend in-memory TTL 2 kelas (issue tmdb-cache)"
```

### Task 2: Review + verifikasi integrasi (gate sebelum merge)

**Files:**
- (tidak ada edit — review)

- [ ] **Step 1: Dispatch reviewer subagent** terhadap diff `server/index.js` — fokus: key cache tak bocorkan `api_key`, 404/401/502 tak dicache, evict LRU benar, TTL 2 kelas sesuai spec, tidak ada regresi error handling.

- [ ] **Step 2: Sesuaikan temuan** dari reviewer (jika ada minor/major) lalu ulangi `node --check` + smoke HIT/MISS/404.

- [ ] **Step 3: Commit perbaikan** (konfirmasi user) jika reviewer menemukan defect nyata.

- [ ] **Step 4: Push + PR `dev` → `main`** (ikuti alur issue sebelumnya; konfirmasi user untuk push/PR/merge).

- [ ] **Step 5: Re-index knowledge graph** (aturan repo #2) via `index_repository(repo_path="C:/Users/Haris/Documents/Local Projek/NonMov", mode="moderate")`.

---

## Self-Review (dilakukan saat menulis)

- **Spec coverage:** TTL 2 kelas ✔ (Task 1), MAX_ENTRIES evict ✔ (Step 3), 404 tidak dicache ✔ (Step 3 + smoke Step 6), error handling dipertahankan ✔ (catch 502 + status upstream), header `res-cache` ✔, non-goals (Redis/SWR/rate-limit) dihormati ✔ (tidak disebut dalam kode).
- **Placeholder scan:** tidak ada TBD/TODO; semua langkah punya kode atau perintah konkret.
- **Type consistency:** `ttlFor(subPath)` konsisten dipakai di lookup & penulisan cache; `cacheKey` dibangun sekali dan dipakai untuk get/set/evict; konstanta nama konsisten.
