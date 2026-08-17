# Filter Lanjutan (Browse): Rating Slider + Negara — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: gunakan `subagent-driven-development` atau
> `executing-plans` untuk implementasi task-by-task. Langkah memakai checkbox (`- [ ]`).

**Goal:** Browse menyaring hasil dengan **rating minimum (slider)** dan **negara asal (dropdown)**,
di samping genre/tahun/urut yang sudah ada.

**Architecture:** Modul baru `src/lib/browseFilters.js` (`COUNTRIES` + `ratingParam` murni)
dipakai oleh `src/pages/Browse.jsx`, yang menambah state `rating`/`negara` (via URL search
params) dan memperluas `buildParams` untuk `tmdb.discover`. Sedikit CSS untuk slider.

**Tech Stack:** React 19 + Vite; `src/lib/tmdb.js` (`discover`, `genres`), `<input type="range">`
native. Tanpa dependency baru, tanpa backend.

**Referensi spec:** `docs/superpowers/specs/2026-08-17-advanced-filters-design.md`

## Global Constraints

- Client-only; JANGAN mengubah `server/`, `src/lib/tmdb.js`, atau halaman lain.
- Tanpa dependency baru (slider = `<input type="range">` native).
- Filter baru tercermin di URL search params (konsisten dengan genre/tahun/urut).
- Endpoint TMDB terverifikasi: `vote_average.gte`, `vote_count.gte`, `with_origin_country`.
- Verifikasi tanpa framework: `npm run build` + smoke node untuk `ratingParam`.
- UI berbahasa Indonesia.
- Re-index knowledge graph setelah perubahan file sumber (aturan repo).

---

### Task 1: Modul `src/lib/browseFilters.js`

**Files:**
- Create: `src/lib/browseFilters.js`

**Interfaces:**
- Produces:
  - `COUNTRIES: Array<{ code: string, name: string }>`
  - `ratingParam(min) -> { gte, countGte } | null`

- [ ] **Step 1: implementasi `COUNTRIES` + `ratingParam`**

```js
// Daftar negara umum (ISO 3166-1) untuk filter with_origin_country.
export const COUNTRIES = [
  { code: 'ID', name: 'Indonesia' },
  { code: 'US', name: 'Amerika Serikat' },
  { code: 'KR', name: 'Korea Selatan' },
  { code: 'JP', name: 'Jepang' },
  { code: 'GB', name: 'Inggris' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'Tiongkok' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Filipina' },
  { code: 'FR', name: 'Prancis' },
  { code: 'DE', name: 'Jerman' },
]

const MIN_VOTES = 100 // ambang suara supaya rating bermakna

// min <= 0 / kosong -> null (tanpa filter). Selain itu -> parameter rating.
export function ratingParam(min) {
  const v = Number(min)
  if (!Number.isFinite(v) || v <= 0) return null
  return { gte: v, countGte: MIN_VOTES }
}
```

- [ ] **Step 2: smoke node untuk `ratingParam`**

```bash
node --input-type=module -e "
import { ratingParam, COUNTRIES } from './src/lib/browseFilters.js'
console.log('zero', ratingParam('0'))         // null
console.log('empty', ratingParam(''))         // null
console.log('seven', ratingParam('7'))        // { gte: 7, countGte: 100 }
console.log('countries', COUNTRIES.length, COUNTRIES[0].code)
"
```

Expected: `zero null`, `empty null`, `seven { gte: 7, countGte: 100 }`, `countries 11 ID`.

- [ ] **Step 3: commit**

```bash
git add src/lib/browseFilters.js
git commit -m "feat(lib): filter browse - COUNTRIES + ratingParam (issue #NN)"
```

---

### Task 2: Integrasi di `src/pages/Browse.jsx`

**Files:**
- Modify: `src/pages/Browse.jsx` (state, buildParams, UI)

**Interfaces:**
- Consumes: `COUNTRIES`, `ratingParam` dari Task 1; `useSearchParams`; `tmdb.discover`.
- Produces: slider rating + dropdown negara di `browse-bar`; hasil ter-filter.

- [ ] **Step 1: state baru dari URL**

```js
import { COUNTRIES, ratingParam } from '../lib/browseFilters'
// di dalam komponen, bersama genre/tahun/urut:
const rating = sp.get('rating') || ''
const negara = sp.get('negara') || ''
```

- [ ] **Step 2: perluas `buildParams`**

```js
const buildParams = (p) => {
  const out = { page: p }
  out.sort_by = /* ...existing... */
  if (genre) out.with_genres = genre
  if (tahun) out[tipe === 'movie' ? 'primary_release_year' : 'first_air_date_year'] = tahun
  if (urut === 'rating') out['vote_count.gte'] = '200'
  const rp = ratingParam(rating)
  if (rp) { out['vote_average.gte'] = String(rp.gte); out['vote_count.gte'] = String(rp.countGte) }
  if (negara) out.with_origin_country = negara
  return out
}
```

- [ ] **Step 3: perbarui dependency efek discover**

Tambahkan `rating` dan `negara` ke dependency array efek yang memanggil `tmdb.discover` (yang
saat ini `[tipe, genre, tahun, urut]`) agar re-run saat berubah.

- [ ] **Step 4: UI slider + dropdown di `browse-bar`**

Di dalam `.browse-bar`, di samping label Tahun & Urutkan:

```jsx
<label>
  Minimal rating {rating ? `: ${rating}+` : ''}
  <input
    type="range" min="0" max="10" step="0.5"
    className="field-range" value={rating || 0}
    onChange={(e) => setParam('rating', e.target.value === '0' ? '' : e.target.value)}
    aria-label="Rating minimum"
  />
</label>
<label>
  Negara
  <select className="field" value={negara} onChange={(e) => setParam('negara', e.target.value)}>
    <option value="">Semua negara</option>
    {COUNTRIES.map((c) => (
      <option key={c.code} value={c.code}>{c.name}</option>
    ))}
  </select>
</label>
```

- [ ] **Step 5: CSS untuk slider**

Tambahkan gaya `.field-range` (lebar, aksen) di `src/styles/` mengikuti gaya `.field` existing.

- [ ] **Step 6: build**

Run: `npm run build`
Expected: PASS tanpa error baru.

- [ ] **Step 7: commit**

```bash
git add src/pages/Browse.jsx src/styles/
git commit -m "feat(browse): filter rating slider + negara (issue #NN)"
```

---

### Task 3: Verifikasi akhir

- [ ] **Step 1:** `npm run build` PASS.
- [ ] **Step 2:** smoke node `ratingParam` (Task 1 Step 2) PASS.
- [ ] **Step 3:** smoke UI live — Browse: geser slider → hasil ter-filter rating; pilih negara →
  hasil ter-filter negara; slider 0 / "Semua negara" tidak memfilter; filter bekerja bersama
  genre/tahun/urut; URL mencerminkan `rating`/`negara`.
- [ ] **Step 4:** re-index knowledge graph (aturan repo).

---

## Self-Review

- **Spec coverage:** `ratingParam`/`COUNTRIES` (Task 1), integrasi Browse + UI + buildParams +
  efek (Task 2), verifikasi build + smoke + UI (Task 3) — semua seksi spec terpetakan.
- **Placeholder scan:** tidak ada TBD/TODO; kode aktual diberikan. Nomor issue (`#NN`) diisi
  saat issue dibuat. Blok `/* ...existing... */` di buildParams merujuk kode sort_by yang sudah
  ada di Browse.jsx — implementer membaca file tersebut.
- **Type consistency:** `ratingParam` dipakai konsisten; parameter TMDB cocok dengan yang
  terverifikasi (`vote_average.gte`, `vote_count.gte`, `with_origin_country`).
