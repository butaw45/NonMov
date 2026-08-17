# Plan: Draft/Publish Status Enforcement

## Masalah

Field `status` (`draft`/`published`) tersimpan per entry di `catalog.json` dan ada UI untuk setnya di AdminEntry + filter di halaman Admin. Tapi **public API tidak memfilter** — `GET /api/catalog/lookup` dan `GET /api/catalog/:id` mengembalikan semua entri tanpa peduli status.

Akibat: entri bertulis `"status": "draft"` tetap bisa ditonton oleh publik.

## Desain

### Prinsip
- **Public API** hanya return entri `published`. Draft = 404 (tidak bocor "ini ada tapi draft").
- **Admin API** tetap return semua (admin butuh lihat + edit draft).
- **Backward compat**: entry tanpa field `status` → default `published` (safe; semua entri existing adalah published).
- **Frontend tidak perlu diubah**: `Watch.jsx` sudah handle 404 dengan pesan "Belum tersedia". Global fallback #10 tetap jalan (catalogLookup return 404 → fallback ke viduki).

### Perubahan

#### `server/index.js` (public API)

**`GET /api/catalog/lookup`** — tambah filter `status === 'published'`:
```js
const item = loadCatalog().find(
  (c) => c.tmdb_id === tmdbId && c.type === type && (c.status || 'published') === 'published'
)
```

**`GET /api/catalog/:id`** — tambah filter yang sama:
```js
const item = loadCatalog().find(
  (c) => String(c.id) === req.params.id && (c.status || 'published') === 'published'
)
```

#### `server/adminRoutes.js` (admin API)

Tidak diubah. Admin tetap lihat semua entri:
- `GET /admin/api/entries?status=draft|published` — filter by status param untuk listing (sudah ada)
- `GET /admin/api/entries/:id` — return entry apapun (sudah ada, tanpa filter)

### Edge Cases

| Kasus | Perilaku |
|-------|----------|
| Entry tanpa `status` | Default `published` (backward compat) |
| Entry `status: "draft"` via public API | 404 |
| Entry `status: "draft"` via admin API | Return normal (admin bisa edit) |
| Draft entry + global fallback #10 | `catalogLookup` return 404 → fallback ke viduki (sesuai config) — ini **benar**, karena draft seharusnya tidak ditampilkan |
| `status` invalid (bukan draft/published) | Default `published` (fail-safe) |

### Verifikasi

1. Set entry ke `draft` → `GET /api/catalog/lookup?tmdb_id=...` return 404
2. Set entry ke `published` → return entry normal
3. `GET /admin/api/entries` tetap return draft + published
4. Entry tanpa field `status` → treated sebagai published
5. Build + smoke test via browser (draft entry → "Belum tersedia", published → normal)

### File yang Berubah

| File | Perubahan |
|------|-----------|
| `server/index.js` | +2 baris filter di 2 endpoint |
| *(tidak ada file lain)* | — |

### Catatan

Tidak ada perubahan frontend, tidak ada perubahan schema `catalog.json`, tidak ada perubahan admin UI. Berbeda dengan issue terdahulu yang butuh branch baru, ini cukup commit langsung ke `dev` (fix kecil, 1 file, backward compat).
