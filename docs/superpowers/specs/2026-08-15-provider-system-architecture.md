# Provider System Architecture

> **Domain model + module boundaries untuk sistem provider (viduki + self + extensible).**
> Issues terkait: #12 (draft/publish enforcement), #13 (provider selector dropdown).

---

## 1. Ubiquitous Language

| Term | Definition |
|------|-----------|
| **Entry** | Satu item katalog (film/series) yang terdaftar di `catalog.json`. Memiliki metadata TMDB + status publish. |
| **Provider** | Sumber video untuk satu entry. Bisa `self` (HLS/DASH yang di-host sendiri) atau `viduki` (embed iframe dari viduki.net) atau tipe lain di masa depan. |
| **Provider Type** | Klasifikasi provider: `self`, `viduki`, dll. Setiap type punya cara resolve stream URL dan cara render player-nya. |
| **Provider Config** | Konfigurasi spesifik per provider type: `video_url` + `video_type` untuk self, `viduki_api` + `viduki_type` + `viduki_color` untuk viduki. |
| **Provider Label** | Nama tampil di dropdown selector (default: "Self-hosted", "viduki.net"). |
| **Global Provider Config** | Konfigurasi default untuk entry yang TIDAK ada di catalog (issue #10). Disimpan di `server/config.json`. |
| **Active Provider** | Provider yang sedang dipilih user di dropdown. Default: provider pertama dalam daftar. |
| **Player** | Renderer video: `ArtPlayer` untuk `self`, `IframePlayer` untuk `viduki`. |
| **Catalog Lookup** | Public API endpoint yang mencari entry by TMDB ID + type. |
| **Draft Entry** | Entry dengan `status: "draft"`. Tidak boleh bocor ke public API. |

---

## 2. Module Boundaries

```
┌──────────────────────────────────────────────────────┐
│                    Watch Page                          │
│  ┌────────────────┐    ┌──────────────────────────┐  │
│  │ Provider Resolver│    │    Player Renderer       │  │
│  │  (Watch.jsx)    │───▶│  (ArtPlayer / IframePlayer)│ │
│  └────────┬───────┘    └──────────────────────────┘  │
│           │ resolve()                                 │
│           ▼                                           │
│  ┌────────────────────────────────────────────────┐  │
│  │  Provider Selector (dropdown)                   │  │
│  │  — hanya muncul jika providers.length > 1       │  │
│  │  — default: pilih pertama                       │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                    Admin Page                          │
│  ┌────────────────────────────────────────────────┐  │
│  │  Provider Form (AdminEntry.jsx)                 │  │
│  │  — list providers + add/remove                  │  │
│  │  — type-specific fields per provider            │  │
│  │  — backward compat: derive dari flat fields     │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                    Backend                            │
│  ┌────────────────┐    ┌──────────────────────────┐  │
│  │ Public API      │    │ Admin API                │  │
│  │ /api/catalog    │    │ /admin/api/entries       │  │
│  │ — filter draft  │    │ — return semua           │  │
│  │ — return published only │                       │  │
│  └────────────────┘    └──────────────────────────┘  │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  Catalog Store (catalog.json)                   │  │
│  │  — entries dengan providers[]                   │  │
│  │  — backward compat: flat fields → providers[]   │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Seam decisions

**Seam 1: Provider Resolution** — `Watch.jsx` resolve providers dari entry + global config. Caller (dropdown + player) tidak perlu tahu dari mana providers datang.

**Seam 2: Player Rendering** — switch `activeProvider.type` → render ArtPlayer atau IframePlayer. Kedua player stateless terhadap provider selection (tidak perlu prop `onSwitch`).

**Seam 3: Catalog Store** — `catalog.json` adalah single source of truth untuk entry + providers. Backend tidak perlu know tentang provider types (frontend yang handle rendering). Admin API pass-through `providers` array.

**Seam 4: Public API Filter** — `GET /api/catalog/lookup` dan `GET /api/catalog/:id` filter `status === 'published'`. Admin API tidak filter.

---

## 3. Data Model

### Entry Schema (catalog.json)

```jsonc
{
  "id": "string (unique)",
  "type": "movie | tv",
  "tmdb_id": 12345,
  "title": "string",
  "status": "published | draft",     // default: published
  "providers": [
    {
      "type": "self | viduki",       // extensible: tambah type baru
      "label": "string (opsional)",   // default: "Self-hosted", "viduki.net"
      // type-specific config:
      // self: { "video_url": "...", "video_type": "hls" }
      // viduki: { "viduki_api": 1-4, "viduki_type": "movie|tv", "viduki_color": "#rrggbb" }
    }
  ]
}
```

### Backward Compat Migration

Entry lama (tanpa `providers`):
```jsonc
{
  "video_provider": "self",         // → derive providers[0] = { type: "self", video_url, video_type }
  "video_url": "...",
  "video_type": "hls",
  "viduki_api": null,
  "viduki_type": null
}
```

Migration logic (frontend, di AdminEntry.jsx saat load):
- Jika `providers` ada → pakai `providers`
- Jika `providers` tidak ada → derive dari flat fields:
  - `video_provider === 'self'` → `[{ type: 'self', video_url, video_type, label: 'Self-hosted' }]`
  - `video_provider === 'viduki'` → `[{ type: 'viduki', viduki_api, viduki_type, viduki_color, label: 'viduki.net' }]`
- Saat save → selalu simpan sebagai `providers` array (jangan lagi simpan flat fields)

### Global Config Schema (server/config.json)

```jsonc
{
  "viduki_enabled": true,           // auto-fallback untuk no-entry
  "viduki_default_api": 2,          // API 1-4
  "viduki_color": "#ef4444"         // warna badge
}
```

---

## 4. Module Interfaces

### 4.1 Provider Resolver (Watch.jsx)

**Responsibility:** Menentukan daftar providers yang tersedia untuk title yang sedang ditonton.

**Input:** `tmdbId`, `type`, `season`, `episode`, `globalConfig`

**Output:** `providers[]` — array of provider objects

**Logic:**
1. `catalogLookup(tmdbId, type)` → entry atau null
2. Jika entry ada → `providers = entry.providers` (atau derive dari flat fields)
3. Jika entry tidak ada + `config.viduki_enabled` → `providers = [{ type: 'viduki', ...config, label: 'viduki.net (global)' }]`
4. Jika entry tidak ada + viduki disabled → `providers = []`

**Interface:**
```
resolveProviders(tmdbId, type, season, episode, config) → Provider[]
```

### 4.2 Player Renderer (Watch.jsx)

**Responsibility:** Render player yang sesuai dengan active provider.

**Input:** `activeProvider`, `providers`, `onSwitchProvider`

**Output:** DOM (ArtPlayer atau IframePlayer)

**Logic:**
```
if (providers.length === 0) → "Belum tersedia"
if (providers.length === 1) → render tanpa dropdown
if (providers.length > 1) → render dropdown + selected player
```

**Interface:**
```
renderPlayer(activeProvider, providers) → JSX
```

### 4.3 Provider Form (AdminEntry.jsx)

**Responsibility:** Form untuk add/edit/remove providers pada entry.

**Input:** `entry` (existing atau baru), `onSave`

**Output:** `providers[]` array

**Logic:**
1. Load entry → check `providers` field
2. Jika tidak ada → derive dari flat fields (backward compat)
3. Tampilkan list providers dengan remove button
4. "Tambah Provider" → modal dengan:
   - Select type (self / viduki)
   - Dynamic form fields berdasarkan type
   - Label input (opsional)
5. Save → kirim `providers` array ke backend

**Interface:**
```
ProviderForm({ entry, onSave }) → JSX
```

### 4.4 Catalog Store (server/index.js + adminRoutes.js)

**Responsibility:** Simpan + retrieve entry dari catalog.json.

**Public API:**
```
GET /api/catalog/lookup?tmdb_id=123&type=movie → Entry | 404
GET /api/catalog/:id → Entry | 404
```

**Admin API:**
```
GET /admin/api/entries → Entry[]
GET /admin/api/entries/:id → Entry
POST /admin/api/entries → Entry
PUT /admin/api/entries/:id → Entry
DELETE /admin/api/entries/:id → 204
```

**Filter logic (public only):**
```
find(entry) where:
  - entry matches tmdb_id + type (lookup) OR id (by-id)
  - AND (entry.status || 'published') === 'published'
  → 404 jika tidak match atau status draft
```

---

## 5. Error Handling

| Error | Handling |
|-------|----------|
| Entry draft via public API | 404 (tidak bocor info) |
| Entry tidak ditemukan | 404 |
| Provider type tidak dikenali | Fallback: "Belum tersedia" |
| Viduki iframe gagal load | PostMessage fallback API 1→2→3→4 (sudah ada di IframePlayer) |
| ArtPlayer HLS gagal | Error boundary + retry button (sudah ada di Watch.jsx) |
| Backend down (fetchConfig) | `fetchConfig()` return null → viduki_enabled = false → "Belum tersedia" |

---

## 6. Testing Strategy

### Backend (manual, no test framework)
- curl `GET /api/catalog/lookup?tmdb_id=...` untuk draft entry → expect 404
- curl `GET /api/catalog/lookup?tmdb_id=...` untuk published entry → expect 200 + JSON
- curl `GET /admin/api/entries` → expect draft + published (semua)

### Frontend (smoke test via browser)
- Entry dengan 2 provider → dropdown muncul, switch正常工作
- Entry dengan 1 provider → tidak ada dropdown, auto-play
- No entry + viduki enabled → fallback ke viduki
- Draft entry (self) → "Belum tersedia"
- Draft entry (viduki) → viduki play (Opsi B)

### Build
- `npm run build` → 0 error

---

## 7. Decisions Recorded

| Decision | Rationale | Issue |
|----------|-----------|-------|
| Draft hanya blokir self-hosted (Opsi B) | Viduki adalah external provider, draft di catalog = "katalog belum siap" bukan "video tidak ada" | #12 |
| Schema `providers[]` menggantikan flat fields | Extensible: bisa tambah provider type baru tanpa migrasi schema | #13 |
| Backward compat via derive di frontend | Entry existing tetap jalan, migrasi otomatis saat edit | #13 |
| Public API filter draft, Admin API tidak filter | Admin butuh lihat + edit draft; publik tidak boleh tahu | #12 |
| Dropdown hanya muncul jika providers.length > 1 | Single provider = tidak perlu pilihan | #13 |

---

## 8. File Impact Matrix

| File | Issue #12 | Issue #13 | Catatan |
|------|-----------|-----------|---------|
| `server/index.js` | ✅ +2 baris filter | — | Public API filter draft |
| `server/admin.js` | — | ✅ handle providers[] | Backward compat |
| `server/adminRoutes.js` | — | ✅ pass-through | Tidak ada filter di admin |
| `server/catalog.json` | — | ✅ migrasi | Entry existing |
| `src/pages/Watch.jsx` | — | ✅ provider selector | resolve + render |
| `src/pages/AdminEntry.jsx` | — | ✅ multi-provider form | Backward compat migration |
| `src/lib/api.js` | — | ✅ providers payload | saveEntry |
| `src/components/IframePlayer.jsx` | — | — | Tidak diubah |
| `src/App.jsx` | — | — | Tidak diubah |
| `src/components/AdminLayout.jsx` | — | — | Tidak diubah |

---

## 9. Open Questions (untuk diskusi lanjut)

1. **Persist active provider per user?** Saat ini active provider hanya di state React (reset saat refresh). Mau disimpan di localStorage?
2. **Provider ordering?** Urutan di `providers[]` = urutan di dropdown. Mau ada drag-drop reorder di admin?
3. **Provider-specific error handling?** Saat ini ArtPlayer dan IframePlayer punya error handling masing-masing. Mau unified error UI?
4. **Viduki sebagai default global?** Saat ini config global cuma viduki. Kalau nanti ada provider lain, global config perlu di-extend.
