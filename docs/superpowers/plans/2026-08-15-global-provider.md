# Rancangan Global Provider + Auto-Fallback (Issue #10)

## 1. Tujuan

Ubah flow provider dari **per-entry catalog** menjadi **global provider settings** dengan auto-fallback:

- Konten TMDB bisa diputar **tanpa entry di catalog** (auto-fallback ke viduki).
- Admin bisa atur settings viduki global (enable/disable, default API, warna) di `/admin/settings`.
- Catalog tetap jalan untuk self-hosted; `viduki_*` per-entry jadi **override** opsional.

## 2. Arsitektur Baru

```
User klik "Tonton" → Watch.jsx
  ├─ Ada entry di catalog?
  │    ├─ video_provider === 'self'   → ArtPlayer (video_url)
  │    └─ video_provider === 'viduki' → IframePlayer (override entry)
  └─ TIDAK ada entry
       └─ config.viduki_enabled === true → IframePlayer (global settings)
            └─ false → "belum bisa diputar" (perilaku lama)
```

## 3. Data Model Baru

### `server/config.json` (BARU)
```json
{
  "viduki_enabled": true,
  "viduki_default_api": 2,
  "viduki_color": "#ef4444"
}
```

### Validasi
- `viduki_enabled` — boolean
- `viduki_default_api` — 1|2|3|4 (default 2)
- `viduki_color` — hex `#RRGGBB` (default `#ef4444`)

## 4. Backend

### 4.1 `server/config.js` (BARU)
- `loadConfig()` — baca config.json, merge default kalau file kosong/hilang.
- `saveConfig(cfg)` — tulis config.json.
- `getConfig()` — return 3 field (safe subset publik).
- `updateConfig(patch)` — validasi + merge + save, return config baru.

### 4.2 `server/index.js`
- `GET /api/config` — publik, return `getConfig()`.

### 4.3 `server/adminRoutes.js`
- `GET /admin/api/config` — protected, return `getConfig()`.
- `PUT /admin/api/config` — protected, body `{ viduki_enabled?, viduki_default_api?, viduki_color? }`, panggil `updateConfig()`, return config baru.

## 5. Frontend

### 5.1 `src/lib/tmdb.js`
- `fetchConfig()` — `GET /api/config`, return config atau `null` (backend mati → frontend tetap jalan).

### 5.2 `src/lib/api.js`
- `adminApi.getConfig()` — `GET /admin/api/config`.
- `adminApi.updateConfig(data)` — `PUT /admin/api/config`.

### 5.3 `src/pages/Watch.jsx`
Resolusi provider:
```js
const entry = catalogEntry
const isViduki = entry?.video_provider === 'viduki'
  || (!entry && config?.viduki_enabled)
const vidukiTmdbId = entry?.tmdb_id ?? (isViduki ? Number(id) : undefined)
const vidukiType  = entry?.viduki_type || kind
const vidukiApi   = entry?.viduki_api || config?.viduki_default_api || 2
const vidukiColor = entry?.viduki_color || config?.viduki_color || '#ef4444'
```
- Muat `catalogLookup` + `fetchConfig` paralel (`Promise.all`).
- Tambah state `resolving` — jangan tampil "belum bisa diputar" sebelum keduanya selesai (hindari flash).

### 5.4 `src/pages/AdminSettings.jsx` (BARU)
Form 3 field: `viduki_enabled` (toggle), `viduki_default_api` (dropdown 1-4), `viduki_color` (color input). Load via `getConfig`, simpan via `updateConfig`. Reuse class `admin-card`/`field`/`btn`/`hint`/`error-box`.

### 5.5 `src/App.jsx`
- Tambah route `<Route path="settings" element={<AdminSettings />} />` di bawah `AdminLayout`.

### 5.6 `src/components/AdminLayout.jsx`
- Tambah link nav `/admin/settings`.

## 6. File yang Diubah/Dibuat

| File | Aksi |
|------|------|
| `server/config.json` | BARU |
| `server/config.js` | BARU |
| `server/index.js` | MODIFY (GET /api/config) |
| `server/adminRoutes.js` | MODIFY (GET/PUT config) |
| `src/lib/tmdb.js` | MODIFY (fetchConfig) |
| `src/lib/api.js` | MODIFY (getConfig/updateConfig) |
| `src/pages/Watch.jsx` | MODIFY (auto-fallback) |
| `src/pages/AdminSettings.jsx` | BARU |
| `src/App.jsx` | MODIFY (route) |
| `src/components/AdminLayout.jsx` | MODIFY (nav link) |

## 7. Testing Checklist

| # | Skenario | Expected |
|---|----------|----------|
| 1 | Buka `/tonton/movie/{id}` tanpa entry catalog | IframePlayer viduki (global settings) |
| 2 | Buka entry self-hosted (Fight Club) | ArtPlayer |
| 3 | Buka entry viduki (Game of Thrones) | IframePlayer (override entry) |
| 4 | Admin set `viduki_enabled=false` | Konten tanpa entry → "belum bisa diputar" |
| 5 | Admin ubah `viduki_default_api` | Konten tanpa entry pakai API baru |
| 6 | Fallback API 1→2→3→4 | Otomatis (IframePlayer existing) |
| 7 | `npm run build` | Pass |

## 8. Catatan

- Branch: `feature/global-provider` dari `feature/viduki-dual-player` (Issue #10 bergantung kode #8: IframePlayer + switch player di Watch.jsx).
- #8 belum di-merge ke `dev`; branch #10 stacked di atasnya.
- `server/catalog.json` punya entry HOTD (viduki) uncommitted dari smoke test #8 — dipakai sebagai contoh override.
