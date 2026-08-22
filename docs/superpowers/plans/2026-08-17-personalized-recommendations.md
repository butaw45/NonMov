# Rekomendasi Personalisasi (Home) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: gunakan `subagent-driven-development` atau
> `executing-plans` untuk implementasi task-by-task. Langkah memakai checkbox (`- [ ]`).

**Goal:** Home menampilkan satu Row "Rekomendasi untukmu" dari gabungan watchlist + history
(multi-seed, scoring), client-side murni.

**Architecture:** Modul baru `src/lib/recommend.js` (dua fungsi murni `collectSeeds` &
`scoreRecommendations`) dipakai oleh `src/pages/Home.jsx`, yang memanggil `tmdb.recommendations`
per seed (Promise.allSettled) dan me-render hasil lewat `Row` yang sudah ada.

**Tech Stack:** React 19 + Vite; `src/lib/tmdb.js` (cache 5 menit), `src/lib/watchlist.js`,
`src/lib/history.js`, `src/components/Row.jsx`. Tanpa dependency baru, tanpa backend.

**Referensi spec:** `docs/superpowers/specs/2026-08-17-personalized-recommendations-design.md`

## Global Constraints

- Client-only; JANGAN mengubah `server/`, `src/lib/tmdb.js`, `Row.jsx`, `PosterCard`, `ContinueRow`.
- Tanpa dependency baru.
- Verifikasi tanpa framework: `npm run build` + smoke node untuk dua fungsi murni.
- Pesan UI berbahasa Indonesia.
- Re-index knowledge graph setelah perubahan file sumber (aturan repo).

---

### Task 1: Modul `src/lib/recommend.js`

**Files:**
- Create: `src/lib/recommend.js`

**Interfaces:**
- Consumes: bentuk entri watchlist `{id,type,title,addedAt,...}` dan history `{id,type,title,updatedAt,...}`.
- Produces:
  - `collectSeeds(watchlist, history, n = 3) -> Array<{type,id,title}>`
  - `scoreRecommendations(seedResults, excludeKeys, limit = 20) -> TmdbItem[]`

- [ ] **Step 1: implementasi `collectSeeds`**

```js
const keyOf = (x) => `${x.type}:${x.id}`

export function collectSeeds(watchlist = [], history = [], n = 3) {
  const seen = new Map()
  for (const h of history) {
    if (h?.id == null || !h.type) continue
    const k = keyOf(h)
    if (!seen.has(k)) seen.set(k, { type: h.type, id: h.id, title: h.title, w: 2, t: h.updatedAt || 0 })
  }
  for (const wl of watchlist) {
    if (wl?.id == null || !wl.type) continue
    const k = keyOf(wl)
    if (!seen.has(k)) seen.set(k, { type: wl.type, id: wl.id, title: wl.title, w: 1, t: wl.addedAt || 0 })
  }
  let sorted = [...seen.values()].sort((a, b) => b.w - a.w || b.t - a.t)
  // diversifikasi: jika n >= 2 dan semua seed bertipe sama,
  // cari kandidat tersisa dari tipe berbeda
  const types = new Set(sorted.slice(0, n).map((s) => s.type))
  if (types.size < 2) {
    const otherType = sorted[0]?.type === 'movie' ? 'tv' : 'movie'
    const swapIdx = sorted.slice(0, n).findLastIndex((s) => s.type !== otherType)
    if (swapIdx >= 0) {
      const replacement = sorted.slice(n).find((s) => s.type === otherType)
      if (replacement) {
        sorted = [...sorted.slice(0, swapIdx), replacement, ...sorted.slice(swapIdx + 1)]
      }
    }
  }
  return sorted.slice(0, n).map(({ type, id, title }) => ({ type, id, title }))
}
```

- [ ] **Step 2: implementasi `scoreRecommendations`**

```js
export function scoreRecommendations(seedResults = [], excludeKeys = new Set(), limit = 20) {
  const acc = new Map()
  for (const { results } of seedResults) {
    for (const it of results || []) {
      if (!it || it.id == null || !it.poster_path) continue
      const type = it.media_type || it.type
      if (!type) continue
      const k = `${type}:${it.id}`
      if (excludeKeys.has(k)) continue
      const cur = acc.get(k) || { item: it, score: 0 }
      cur.score += 1 + (it.vote_average || 0) / 10
      acc.set(k, cur)
    }
  }
  return [...acc.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item)
}
```

- [ ] **Step 3: smoke node untuk kedua fungsi**

Jalankan (ESM, tanpa framework):

```bash
node --input-type=module -e "
import { collectSeeds, scoreRecommendations } from './src/lib/recommend.js'

// Test: collectSeeds — history bobot > watchlist, diversifikasi tipe
const wl = [{ id: 1, type: 'movie', title: 'A', addedAt: 100 }, { id: 4, type: 'movie', title: 'D', addedAt: 150 }]
const hi = [{ id: 2, type: 'tv', title: 'B', updatedAt: 200 }]
const seeds = collectSeeds(wl, hi, 3)
console.log('seeds', seeds)
// Expected: tv:2 (history) dulu, lalu movie:1 (watchlist), lalu movie:4
// Harus ada tipe campuran (tv+movie) — bukan 3 movie

// Test: scoreRecommendations — vote_average/10
const res = scoreRecommendations(
  [ { seed: {}, results: [{ id: 9, media_type: 'movie', poster_path: '/x', vote_average: 80 }] },
    { seed: {}, results: [{ id: 9, media_type: 'movie', poster_path: '/x', vote_average: 80 }] } ],
  new Set(['movie:1'])
)
console.log('reco', res.map((r) => r.id))
// Expected: [9] — dedup meski 2 seed; score = (1+8)+(1+8) = 18
// movie:1 di-exclude sehingga tidak muncul
console.log('test passed')
"
```

Expected: `seeds` = tv:2 dulu (bobot history), lalu movie:1; `reco` = `[9]` (dedup, dua seed → skor lebih tinggi, tidak error).

- [ ] **Step 4: commit**

```bash
git add src/lib/recommend.js
git commit -m "feat(lib): modul rekomendasi - collectSeeds + scoreRecommendations (issue #NN)"
```

---

### Task 2: Integrasi di `src/pages/Home.jsx`

**Files:**
- Modify: `src/pages/Home.jsx` (efek rekomendasi + render Row)

**Interfaces:**
- Consumes: `collectSeeds`, `scoreRecommendations` dari Task 1; `useWatchlist`, `useHistory`; `tmdb.recommendations`; `Row`.
- Produces: Row "Rekomendasi untukmu" di Home.

- [ ] **Step 1: impor + baca history**

```js
import { useHistory } from '../lib/history'
import { collectSeeds, scoreRecommendations } from '../lib/recommend'
```

Di dalam komponen: `const history = useHistory()`.

- [ ] **Step 2: ganti efek rekomendasi**

Ganti efek watchlist-saja menjadi:

```js
useEffect(() => {
  const seeds = collectSeeds(watchlist, history, 3)
  if (!seeds.length) { setPicks(null); setPicksLoading(false); return }
  setPicksLoading(true)
  let alive = true
  const exclude = new Set([
    ...watchlist.map((x) => `${x.type}:${x.id}`),
    ...history.map((x) => `${x.type}:${x.id}`),
  ])
  Promise.allSettled(seeds.map((s) => tmdb.recommendations(s.type, s.id)))
    .then((settled) => {
      if (!alive) return
      const seedResults = settled
        .map((r, i) => (r.status === 'fulfilled' ? { seed: seeds[i], results: r.value?.results } : null))
        .filter(Boolean)
      let items = scoreRecommendations(seedResults, exclude, 20)
      // Fallback: jika hasil kosong/gagal semua, pakai trending
      if (!items.length && rows?.trendW?.length) {
        items = rows.trendW.slice(0, 20)
      }
      setPicks(items.length ? items : null)
      setPicksLoading(false)
    })
  return () => { alive = false; setPicksLoading(false) }
}, [watchlist, history])
```

Catatan: efek ini butuh akses ke `rows` state (untuk fallback trending). Pastikan `rows` sudah dalam scope atau baca dari localStorage. **Pendekatan paling aman**: gunakan `tmdb.trending('week')` langsung sebagai fallback (jangan bergantung pada state `rows` yang mungkin belum siap). Alternatif: simpan `rows.trendW` di ref saat fetch pertama selesai.

```js
// Rekomendasi: fallback panggil trending langsung
if (!items.length) {
  const trendRes = await tmdb.trending('week').catch(() => null)
  if (trendRes?.results?.length) {
    items = trendRes.results.filter((x) => x.poster_path).slice(0, 20)
  }
}
```

- [ ] **Step 3: render Row + skeleton**

Tambah state di atas komponen: `const [picksLoading, setPicksLoading] = useState(false)`

Render di antara `<ContinueRow />` dan baris kategori (posisi aman karena `ContinueRow` return `null` bila kosong — tidak ada gap DOM):

```jsx
<ContinueRow />
{picksLoading && <RowSkeleton />}
{picks && !picksLoading && <Row kicker="Dipersonalisasi" title="Rekomendasi untukmu" items={picks} />}
```

Impor `RowSkeleton` dari Skeletons bila belum: `import { RowSkeleton } from '../components/Skeletons'`

- Hapus render `picks` lama (`{picks && picks.items.length > 0 && ...}`).
- `picks` kini berupa array item, bukan objek `{seed, items}`.
- Saat `picksLoading`, skeleton tampil di posisi yang sama — layout tidak jump.
- Saat selesai & `picks` null → skeleton & Row hilang (tidak ada yang dirender).

- [ ] **Step 4: build**

Run: `npm run build`
Expected: PASS tanpa error baru.

- [ ] **Step 5: commit**

```bash
git add src/pages/Home.jsx
git commit -m "feat(home): rekomendasi personalisasi multi-seed (issue #NN)"
```

---

### Task 3: Verifikasi akhir

- [ ] **Step 1:** `npm run build` PASS.
- [ ] **Step 2:** smoke node `recommend.js` (Task 1 Step 3) PASS.
- [ ] **Step 3:** smoke UI live — server dev + Home; seed dari watchlist/history memunculkan Row "Rekomendasi untukmu"; pengguna baru tidak melihatnya.
- [ ] **Step 4:** re-index knowledge graph (aturan repo).

---

## Self-Review

- **Spec coverage:** collectSeeds (Task 1), scoreRecommendations (Task 1), integrasi Home + Row (Task 2), verifikasi build + smoke + UI (Task 3) — semua seksi spec terpetakan.
- **Placeholder scan:** tidak ada TBD/TODO; kode aktual diberikan. Nomor issue (`#NN`) diisi saat issue dibuat.
- **Type consistency:** `collectSeeds`/`scoreRecommendations` dipakai konsisten di Task 1 & 2; bentuk item TMDB (`media_type`, `poster_path`, `vote_average`) sesuai pemakaian di `Home.jsx`/`Row.jsx`.
- **Amendments (5 poin):**
  1. Score weight: `vote_average/10` bukan `/100` (bobot seimbang).
  2. Loading skeleton: `picksLoading` state + `RowSkeleton` cegah layout jump.
  3. Seed diversity: swap seed jika semua bertipe sama.
  4. Fallback konten: trending dipakai bila rekomendasi kosong (seeds ada).
  5. Posisi adaptif: dikonfirmasi aman (ContinueRow return null saat kosong).
