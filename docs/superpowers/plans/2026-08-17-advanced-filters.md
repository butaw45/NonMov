# Filter Lanjutan (Browse): Rating Slider + Negara — Implementation Plan (Amended)

> **Amended 2026-08-22:**
> - 🔴 `vote_count.gte` collision fix: `ratingParam(existingCountGte?)` + `Math.max`
> - 🔴 Debounce slider: `draftRating` local state, 300ms debounce ke URL
> - 🟡 Slider bubble: label `: X+` live saat drag
> - 🟡 Tombol "Setel ulang": clear semua search params
> - 🟢 Responsive: `max-width: 240px` slider constraint
> - 🟢 Dead import cleanup: `import { keyOf }` hapus dari Browse.jsx
> - Spec lengkap: `docs/superpowers/specs/2026-08-17-advanced-filters-design.md`

**Goal:** Browse menyaring hasil dengan **rating minimum (slider)** dan **negara asal (dropdown)**,
di samping genre/tahun/urut yang sudah ada.

**Architecture:** Modul baru `src/lib/browseFilters.js` (`COUNTRIES` + `DEBOUNCE_MS` + `ratingParam`
murni) dipakai oleh `src/pages/Browse.jsx`, yang menambah state `rating`/`draftRating`/`negara`
(via URL search params + local state) dan memperluas `buildParams` untuk `tmdb.discover`.
Debounce 300ms untuk slider mencegah spam API. Sedikit CSS untuk slider + tombol reset.

**Tech Stack:** React 19 + Vite; `src/lib/tmdb.js` (`discover`, `genres`), `<input type="range">`
native, `useRef` untuk timer. Tanpa dependency baru, tanpa backend.

**Referensi spec:** `docs/superpowers/specs/2026-08-17-advanced-filters-design.md`

## Global Constraints

- Client-only; JANGAN mengubah `server/`, `src/lib/tmdb.js`, atau halaman lain.
- Tanpa dependency baru (slider = `<input type="range">` native).
- Filter baru tercermin di URL search params (konsisten dengan genre/tahun/urut).
- Endpoint TMDB terverifikasi: `vote_average.gte`, `vote_count.gte`, `with_origin_country`.
- Verifikasi tanpa framework: `npm run build` + smoke node untuk `ratingParam`.
- UI berbahasa Indonesia.
- Re-index knowledge graph setelah perubahan file sumber (aturan repo).
- **Nomer issue:** #24.

---

### Task 1: `src/lib/browseFilters.js`

**Files:**
- **Create:** `src/lib/browseFilters.js`
- **Create (sementara):** `smoke-browse-filters.mjs`

**Interfaces:**
- `COUNTRIES: Array<{ code: string, name: string }>`
- `DEBOUNCE_MS: 300`
- `ratingParam(min, existingCountGte?) -> { gte, countGte } | null`
  - `existingCountGte` mencegah override sort-by-rating threshold

- [ ] **Step 1: implementasi**

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

export const DEBOUNCE_MS = 300

const MIN_VOTES = 100

// ratingParam(min, existingCountGte?)
//   min <= 0 / kosong -> null (tanpa filter)
//   Selain itu -> parameter rating dengan vote_count.gte = Math.max(100, existing)
export function ratingParam(min, existingCountGte) {
  const v = Number(min)
  if (!Number.isFinite(v) || v <= 0) return null
  return { gte: v, countGte: Math.max(MIN_VOTES, existingCountGte || 0) }
}
```

- [ ] **Step 2: smoke node**

```bash
node --input-type=module -e "
import { ratingParam, COUNTRIES, DEBOUNCE_MS } from './src/lib/browseFilters.js'
console.assert(ratingParam('0') === null, 'zero -> null')
console.assert(ratingParam('') === null, 'empty -> null')
const r7 = ratingParam('7')
console.assert(r7?.gte === 7 && r7?.countGte === 100, '7 -> gte=7 count=100')
// collision fix: existingCountGte=200 override menjadi 200
const rColl = ratingParam('7', 200)
console.assert(rColl?.countGte === 200, 'existingGte=200 -> count tetap 200, bukan 100')
console.assert(COUNTRIES.length === 11, '11 country entries')
console.assert(DEBOUNCE_MS === 300, 'debounce 300ms')
console.log('COUNTRIES', COUNTRIES[0].code)
console.log('PASS')
"
```

Expected: `COUNTRIES ID` dan `PASS`.

- [ ] **Step 3: commit**

```bash
git add src/lib/browseFilters.js smoke-browse-filters.mjs
git commit -m "feat(lib): filter browse - COUNTRIES + DEBOUNCE_MS + ratingParam + collision fix (issue #24)"
```

---

### Task 2: Integrasi di `src/pages/Browse.jsx`

**Files:**
- **Edit:** `src/pages/Browse.jsx` (state, debounce, buildParams, UI)
- **Edit:** `src/styles/pages.css` (CSS slider + reset button)

**Interface changes:**
- Impor baru: `COUNTRIES`, `DEBOUNCE_MS`, `ratingParam` dari `browseFilters`
- Hapus import: `keyOf` (dead import)
- State baru: `draftRating` (local), `rating` + `negara` (URL)
- Efek baru: debounce `draftRating` → `rating` URL (300ms)
- `buildParams`: perluas dengan `ratingParam` + `with_origin_country`
- Dependency efek discover: tambah `rating`, `negara`
- UI: slider + dropdown + tombol reset

- [ ] **Step 1: impor + state**

```js
// Ganti:
import { cx } from '../lib/utils'   // hapus keyOf dari import
// Tambah di impor:
import { COUNTRIES, DEBOUNCE_MS, ratingParam } from '../lib/browseFilters'
```

**State baru** (di bagian deklarasi state, setelah `sp.get(...)` lines):

```js
const rating = sp.get('rating') || ''
const [draftRating, setDraftRating] = useState(rating)  // local, live saat drag
const negara = sp.get('negara') || ''
```

- [ ] **Step 2: debounce effect** (antara state declarations dan genre effect)

```js
// Debounce: local draftRating → URL rating (300ms) — cegah spam API saat drag slider
useEffect(() => {
  const t = setTimeout(() => {
    const next = new URLSearchParams(sp)
    if (draftRating && draftRating !== '0') next.set('rating', draftRating)
    else next.delete('rating')
    setSp(next, { replace: true })
  }, DEBOUNCE_MS)
  return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [draftRating])
```

> **Mengapa `sp` ada di dependency?** ESLint exhaustive-deps akan minta `sp` dan `setSp`
> — tapi `sp` berubah setiap debounce selesai, menyebabkan loop. Pakai `// eslint-disable-next-line`.
> `setSp` stabil identitasnya dari `useSearchParams`.

- [ ] **Step 3: perluas `buildParams`**

```js
const buildParams = (p) => {
  const out = { page: p }
  out.sort_by =
    urut === 'rating' ? 'vote_average.desc'
    : urut === 'baru' ? (tipe === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc')
    : 'popularity.desc'
  if (genre) out.with_genres = genre
  if (tahun) out[tipe === 'movie' ? 'primary_release_year' : 'first_air_date_year'] = tahun
  if (urut === 'rating') out['vote_count.gte'] = '200'

  // Baru: rating filter — passing existing vote_count.gte untuk Math.max anti-collision
  const rp = ratingParam(rating, Number(out['vote_count.gte']))
  if (rp) {
    out['vote_average.gte'] = String(rp.gte)
    out['vote_count.gte'] = String(rp.countGte)
  }

  // Baru: negara filter
  if (negara) out.with_origin_country = negara
  return out
}
```

- [ ] **Step 4: perbarui dependency efek discover**

```js
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [tipe, genre, tahun, urut, rating, negara])
```

- [ ] **Step 5: UI — slider + dropdown + reset button**

Di dalam `.browse-bar`, sebelum `</div>`:

```jsx
<label className="filter-rating">
  Minimal rating{draftRating && Number(draftRating) > 0 ? ` : ${draftRating}+` : ''}
  <input
    type="range" min="0" max="10" step="0.5"
    className="field-range"
    value={draftRating || 0}
    onChange={(e) => setDraftRating(e.target.value)}
    onMouseUp={() => {
      // Commit paksa saat release — tambahan di atas debounce
      const next = new URLSearchParams(sp)
      if (draftRating && draftRating !== '0') next.set('rating', draftRating)
      else next.delete('rating')
      setSp(next, { replace: true })
    }}
    onTouchEnd={() => {
      const next = new URLSearchParams(sp)
      if (draftRating && draftRating !== '0') next.set('rating', draftRating)
      else next.delete('rating')
      setSp(next, { replace: true })
    }}
    aria-label="Rating minimum"
    aria-valuenow={Number(draftRating || 0)}
    aria-valuemin={0}
    aria-valuemax={10}
  />
</label>
<label>
  Negara
  <select
    className="field"
    value={negara}
    onChange={(e) => setParam('negara', e.target.value)}
  >
    <option value="">Semua negara</option>
    {COUNTRIES.map((c) => (
      <option key={c.code} value={c.code}>{c.name}</option>
    ))}
  </select>
</label>
{(rating || negara || genre || tahun || urut !== 'populer') && (
  <button
    className="btn-reset"
    onClick={() => { setSp(new URLSearchParams()); setDraftRating('') }}
  >
    Setel ulang
  </button>
)}
```

- [ ] **Step 6: CSS** (tambahkan di `src/styles/pages.css`)

Di bagian `.browse-bar` block:

```css
/* Filter rating slider */
.browse-bar label.filter-rating {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 240px;
}
.field-range {
  width: 120px;
  accent-color: var(--clr-accent);
  cursor: pointer;
  vertical-align: middle;
}
/* Tombol reset filter */
.btn-reset {
  padding: 4px 12px;
  font-size: 0.85rem;
  border-radius: 6px;
  border: 1px solid var(--clr-border);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  color: var(--clr-text);
}
.btn-reset:hover { background: var(--clr-surface-hover); }
```

> **Catatan:** Jika `.field-range` sudah ada di file CSS lain → gunakan selector spesifik
> `.browse-bar .field-range` untuk hindari bentrok.

- [ ] **Step 7: build**

```bash
npm run build
```
Expected: PASS tanpa error baru.

- [ ] **Step 8: commit**

```bash
git add src/pages/Browse.jsx src/styles/pages.css
git commit -m "feat(browse): filter rating slider + negara + debounce + collision fix (issue #24)"
```

---

### Task 3: Verifikasi akhir

- [ ] **Step 1:** `npm run build` PASS.
- [ ] **Step 2:** smoke node `smoke-browse-filters.mjs` — semua assertion PASS.
- [ ] **Step 3:** smoke UI di browser (atau dev server):
  - Browse: geser slider → hasil ter-filter rating
  - Label `: X+` update live saat drag
  - Debounce: tidak flood saat drag cepat
  - Pilih negara dropdown → hasil ter-filter
  - `vote_count.gte` collision: urut=rating + slider 7 → hasil masih bermakna (≥200 votes)
  - Slider 0 / "Semua negara" tidak memfilter
  - Filter bekerja bersama genre/tahun/urut
  - URL mencerminkan `?rating=..&negara=..`
  - Tombol "Setel ulang" muncul saat ada filter aktif, mereset semua
  - Responsive: slider wrap dengan rapi di viewport sempit
- [ ] **Step 4:** hapus `smoke-browse-filters.mjs` (atau simpan sebagai dev tool).
- [ ] **Step 5:** re-index knowledge graph.

---

## Self-Review

- **Spec coverage:** Semua seksi spec terpetakan: `ratingParam` + `DEBOUNCE_MS` + `COUNTRIES`
  (Task 1), integrasi Browse + debounce + collision fix + UI + reset + responsive (Task 2),
  verifikasi build + smoke + UI (Task 3).
- **Amendemen coverage:**
  - `vote_count.gte` collision → `ratingParam(existingCountGte)` + `Math.max`. ✅
  - Debounce slider → `draftRating` + `useEffect` 300ms + `onMouseUp`/`onTouchEnd` commit. ✅
  - Label live → `${draftRating}+`. ✅
  - Reset filter → `btn-reset` set `new URLSearchParams()`. ✅
  - Responsive → `max-width: 240px` + `flex-wrap: wrap`. ✅
  - Dead import → hapus `keyOf` dari `import { cx, keyOf }`. ✅
- **Placeholder scan:** tidak ada TBD/TODO; kode aktual diberikan. Nomor issue diisi (`#24`).
- **Edge case debounce:** `clearTimeout` di cleanup mencegah state update pada unmounted
  component (sudah standar React). ✅

## Perubahan file

| File | Action |
|---|---|
| `src/lib/browseFilters.js` | **Create** — COUNTRIES, DEBOUNCE_MS, ratingParam |
| `smoke-browse-filters.mjs` | **Create (sementara)** — smoke node |
| `src/pages/Browse.jsx` | **Edit** — debounce, buildParams, UI, dead import cleanup |
| `src/styles/pages.css` | **Edit** — .field-range, .btn-reset, .filter-rating |