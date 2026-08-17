# Admin Panel Design Spec

**Tanggal:** 2026-08-15  
**Status:** Approved  
**Spesifikasi untuk:** Issue #5 — Admin Panel (CRUD entri katalog + auto-match TMDB)

---

## 1. Overview & Goals

### Tujuan
Memungkinkan admin untuk menambah, mengedit, dan menghapus entri katalog tanpa edit file JSON manual. Admin panel adalah bottleneck utama untuk content management — tanpa ini, platform tidak bisa ditambah konten baru kecuali via git commit.

### Scope Versi Pertama
- Auth admin sederhana (env-based credentials)
- CRUD entri katalog (create, read, update, delete)
- Auto-match judul ke TMDB (search + pilih result)
- Draft/publish status per entri
- Frontend UI minimal (list + form add/edit)

### Out of Scope (versi pertama)
- Multi-admin dengan role berbeda
- Upload file video (hanya input URL)
- Subtitle management
- Rekomendasi personalisasi
- Audit log / history changes

---

## 2. Architecture

### Backend (server/)

```
server/
├── index.js              # Tidak diubah — proxy TMDB, catalog API, static serve
├── admin.js              # Baru — business logic (auth, CRUD, auto-match)
└── adminRoutes.js        # Baru — Express routes untuk admin
```

**Prinsip:** Module terpisah untuk separation of concerns. `adminRoutes.js` handle HTTP layer, `admin.js` handle logic. Kedua file di-require di `index.js` dan mount di `/admin`.

### Frontend (src/)

```
src/
├── pages/
│   ├── Admin.jsx         # Baru — halaman list entries
│   ├── AdminEntry.jsx    # Baru — form add/edit entri
│   └── AdminLogin.jsx    # Baru — halaman login
├── components/
│   └── AdminLayout.jsx   # Baru — shell admin (header + nav + logout)
└── lib/
    └── api.js            # Ditambah helper admin (fetch dengan cookie auth)
```

### Route Structure

```
Frontend (React Router):
  /admin/login          → AdminLogin (public)
  /admin                → Admin (protected)
  /admin/entry          → AdminEntry (create mode)
  /admin/entry/:id      → AdminEntry (edit mode)

Backend (Express):
  POST   /admin/login               → verify credentials, set session cookie
  POST   /admin/logout              → clear session cookie
  GET    /admin/api/entries         → list all entries
  GET    /admin/api/entries/:id     → get single entry
  POST   /admin/api/entries         → create entry
  PUT    /admin/api/entries/:id     → update entry
  DELETE /admin/api/entries/:id     → delete entry
  POST   /admin/api/match           → search TMDB by judul
```

---

## 3. Auth & Session

### Mechanism: Session Cookie (env-based credentials)

**Credentials:**
- `ADMIN_USER` — username (default: `admin`)
- `ADMIN_PASS` — password (default: minimal 8 chars, disarankan ubah di production)
- `ADMIN_SESSION_TIMEOUT` — timeout dalam jam (default: `24`)

**Session Token:** Base64 encoded string `timestamp:randomHex`. Disimpan di `server/catalog.json` sebagai `sessions` array untuk validasi tanpa database terpisah.

**Cookie Properties:**
- `httpOnly: true` — tidak bisa diakses via JavaScript
- `secure: false` di development, `true` di production (cek `NODE_ENV`)
- `sameSite: 'lax'`
- `maxAge`: `ADMIN_SESSION_TIMEOUT * 3600 * 1000` ms

**Middleware: `protectRoute(req, res, next)`**
1. Cek cookie `admin_session` ada
2. Decode base64 → `timestamp:randomHex`
3. Cek `timestamp` masih valid (belum expired)
4. Cek `randomHex` ada di `sessions` array di catalog.json
5. Jika valid → `next()`
6. Jika tidak → clear cookie → 401 Unauthorized

**Logout:** Hapus cookie + hapus token dari `sessions` array.

---

## 4. CRUD Entri Katalog

### Data Model

Setiap entri di `server/catalog.json`:

```json
{
  "entries": [
    {
      "id": "550-movie-20260815-a1b2c3d4",
      "type": "movie" | "tv",
      "tmdb_id": 550,
      "title": "Fight Club",
      "status": "draft" | "published",
      "video_url": null | "https://...",
      "video_type": "hls" | "dash" | "embed",
      "created_at": "2026-08-15T01:00:00Z",
      "updated_at": "2026-08-15T01:00:00Z"
    }
  ],
  "sessions": [
    {
      "token": "a1b2c3d4:1234567890",
      "created_at": "2026-08-15T01:00:00Z"
    }
  ]
}
```

**Catatan:** Metadata lain (poster, sinopsis, cast, episode, watch-providers) **tidak disimpan di catalog** — di-fetch langsung dari TMDB API via proxy (`/3/movie/{id}`, `/3/tv/{id}`, `/3/tv/{id}/season/{season_number}`). Catalog hanya simpan kontrol metadata: `id`, `type`, `tmdb_id`, `status`, `video_url`, `video_type`.

### Operasi CRUD

| Operasi | Route | Deskripsi |
|---------|-------|-----------|
| **List** | `GET /admin/api/entries` | Return semua entries. Query param `?status=` untuk filter (`draft`, `published`, atau kosong = semua) |
| **Get** | `GET /admin/api/entries/:id` | Return single entry by ID |
| **Create** | `POST /admin/api/entries` | Body: `{ type, tmdb_id, status?, video_url?, video_type? }`. Auto-fetch title dari TMDB. Return entry baru |
| **Update** | `PUT /admin/api/entries/:id` | Body: partial update (hanya field yang diubah). Return entry updated |
| **Delete** | `DELETE /admin/api/entries/:id` | Hapus entry + return 204 No Content |

### Business Rules
- `type` harus `movie` atau `tv`
- `tmdb_id` harus integer positif
- `status` default: `draft` (saat create via auto-match), `published` (saat create manual dengan video_url)
- `video_type` default: `hls` (hanya divalidasi jika `video_url` diisi)
- `video_url` harus diawali `http://` atau `https://` jika diisi
- Duplicate `tmdb_id` + `type` combination → return 409 Conflict
- ID generation: `${tmdb_id}-${type}-${timestamp}-${random4chars}`

---

## 5. Auto-match TMDB

### Flow

```
Frontend: POST /admin/api/match
  Body: { query: "Fight Club", type?: "movie" | "tv" }
  ↓
Backend: panggil TMDB /3/search/multi?query=FightClub&include_adult=false
  ↓
Filter results by type (jika `type` diisi, hanya return result yang cocok)
  ↓
Sort by popularity, take top 10
  ↓
Return: [{ id, title, type, poster_path, overview, year, popularity }]
  ↓
Frontend: tampilkan grid hasil pencarian
  ↓
Admin klik "Pilih" pada salah satu result
  ↓
Frontend: POST /admin/api/entries
  Body: { type, tmdb_id }
  ↓
Backend: fetch detail dari TMDB, create entry dengan status "draft"
  ↓
Redirect ke /admin/entry/:id (edit mode) untuk tambah video_url
```

### TMDB API Calls
- Search: `GET /3/search/multi?query={query}&include_adult=false&page=1`
- Detail (untuk validasi): `GET /3/{type}/{tmdb_id}` (hanya untuk ambil title yang akurat)

### Error Handling
- TMDB API key missing/invalid → return 500 dengan message "TMDB API tidak terkonfigurasi"
- Search return empty → return 200 dengan empty array `[]`
- TMDB rate limit (429) → return 429 + message "Terlalu banyak permintaan ke TMDB. Tunggu 10 detik."
- Network error → return 500 + message "Gagal konek ke TMDB"

---

## 6. Frontend Admin UI

### Halaman: AdminLogin (`/admin/login`)
- Form: username + password
- Submit: POST /admin/login
- On success: set cookie + redirect ke `/admin`
- On error: tampilkan error message
- Jika sudah login (cookie valid): redirect ke `/admin`

### Halaman: Admin (`/admin`)
- **Header:** "Seluloid Admin" + tombol "Tambah Entri Baru" + tombol "Logout"
- **Filter:** Dropdown "Semua" / "Draft" / "Published"
- **List:** Table atau card list entries
  - Kolom: Title, Type, TMDB ID, Status, Video, Updated
  - Action: Edit, Delete (dengan konfirmasi)
- **Empty state:** "Belum ada entri. Klik 'Tambah Entri Baru' untuk memulai."

### Halaman: AdminEntry (`/admin/entry` atau `/admin/entry/:id`)
- **Mode Create:** Form kosong
- **Mode Edit:** Form pre-filled dengan data entry
- **Form Fields:**
  1. Cari Judul (auto-match): input text + tombol "Cari TMDB"
     - Jika ada hasil: tampilkan grid poster + title + year + tombol "Pilih"
     - Setelah pilih: auto-fill `type`, `tmdb_id`, `title`
  2. Atau Manual: input TMDB ID + select type (Movie/TV)
  3. Video URL: input text (placeholder: `https://...`)
  4. Video Type: select (HLS / DASH / Embed)
  5. Status: select (Draft / Published)
- **Actions:** Simpan, Batal
- **Validation:**
  - TMDB ID harus diisi
  - Type harus dipilih
  - Video URL opsional, tapi jika diisi harus valid URL
  - Submit: POST (create) atau PUT (edit)

### Komponen: AdminLayout
- Navbar: logo "Seluloid Admin" kiri, tombol "Logout" kanan
- Proteksi route: jika tidak ada cookie `admin_session`, redirect ke `/admin/login`
- Sederhana, tidak perlu sidebar kompleks

### Route Protection (Frontend)
```jsx
// src/App.jsx
import { AdminLayout, AdminLogin, Admin, AdminEntry } from './pages/Admin'

<Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
  <Route index element={<Admin />} />
  <Route path="entry" element={<AdminEntry />} />
  <Route path="entry/:id" element={<AdminEntry />} />
</Route>
<Route path="/admin/login" element={<AdminLogin />} />
```

`ProtectedRoute` component: cek cookie `admin_session` via `document.cookie`. Jika tidak ada → redirect ke `/admin/login`.

---

## 7. Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| TMDB API key missing/invalid | Tampilkan error "TMDB API tidak terkonfigurasi" di admin + return 500 |
| Search TMDB return empty | Tampilkan "Tidak ada hasil untuk '{query}'" + tombol "Input Manual" |
| Video URL invalid format | Validate: harus diawali `http://`/`https://` untuk HLS/DASH; untuk embed, allow `embed_id` saja |
| Duplicate tmdb_id + type | Return error 409 "Entry untuk judul ini sudah ada" |
| Session expired/invalid | Redirect otomatis ke `/admin/login` dengan pesan "Sesi berakhir. Silakan login kembali." |
| Catalog.json corrupt | Fallback: return empty array, log error ke console, return 500 |
| Network error TMDB | Tampilkan "Gagal konek ke TMDB. Coba lagi." + retry button |
| Invalid credentials login | Tampilkan "Username atau password salah" + shake animation |
| Delete entry yang sedang dipakai | Return 409 "Entry ini tidak bisa dihapus karena masih direferensikan" (opsional, bisa diabaikan versi pertama) |

---

## 8. API Contract

### Request/Response Examples

#### POST /admin/login
**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Login berhasil"
}
```
Set-Cookie: `admin_session=eyJ0aW1lc3RhbXAiOjE3Mj...; HttpOnly; SameSite=Lax; Max-Age=86400`

**Error (401):**
```json
{
  "success": false,
  "message": "Username atau password salah"
}
```

#### GET /admin/api/entries
**Query Params:**
- `status` (optional): `draft` | `published` | (kosong = semua)

**Success (200):**
```json
{
  "entries": [
    {
      "id": "550-movie-20260815-a1b2c3d4",
      "type": "movie",
      "tmdb_id": 550,
      "title": "Fight Club",
      "status": "published",
      "video_url": "https://...",
      "video_type": "hls",
      "created_at": "2026-08-15T01:00:00Z",
      "updated_at": "2026-08-15T01:00:00Z"
    }
  ]
}
```

#### POST /admin/api/entries
**Request:**
```json
{
  "type": "movie",
  "tmdb_id": 550,
  "status": "published",
  "video_url": "https://...",
  "video_type": "hls"
}
```

**Success (201):**
```json
{
  "id": "550-movie-20260815-a1b2c3d4",
  "type": "movie",
  "tmdb_id": 550,
  "title": "Fight Club",
  "status": "published",
  "video_url": "https://...",
  "video_type": "hls",
  "created_at": "2026-08-15T01:00:00Z",
  "updated_at": "2026-08-15T01:00:00Z"
}
```

**Error (409):**
```json
{
  "error": "Entry untuk TMDB ID 550 (movie) sudah ada"
}
```

#### POST /admin/api/match
**Request:**
```json
{
  "query": "Fight Club",
  "type": "movie"
}
```

**Success (200):**
```json
{
  "results": [
    {
      "id": 550,
      "title": "Fight Club",
      "type": "movie",
      "poster_path": "/pB8BM7pdSp6B6Ih7QZvDrnu5T44.jpg",
      "overview": "A ticking-time-bomb insomniac...",
      "year": "1999",
      "popularity": 42.5
    }
  ]
}
```

---

## 9. File Structure

### Backend Files

**`server/admin.js`** (~150 lines)
- Functions:
  - `loadCatalog()` — read + parse catalog.json, return { entries, sessions }
  - `saveCatalog(data)` — write catalog.json
  - `verifyCredentials(username, password)` — compare dengan env vars
  - `createSession()` — generate token, add to sessions, return token
  - `validateSession(token)` — cek token valid + not expired
  - `destroySession(token)` — hapus token dari sessions
  - `protectRoute(req, res, next)` — Express middleware
  - `getEntries(filterStatus)` — return entries array
  - `getEntryById(id)` — return single entry
  - `createEntry(data)` — validate + create + save
  - `updateEntry(id, data)` — validate + update + save
  - `deleteEntry(id)` — delete + save
  - `searchTMDB(query, type)` — panggil TMDB API, return results

**`server/adminRoutes.js`** (~120 lines)
- Express Router mount di `/admin`
- Routes:
  - `POST /login` → admin.verifyCredentials + admin.createSession
  - `POST /logout` → admin.destroySession
  - `GET /api/entries` → protectRoute + admin.getEntries
  - `GET /api/entries/:id` → protectRoute + admin.getEntryById
  - `POST /api/entries` → protectRoute + admin.createEntry
  - `PUT /api/entries/:id` → protectRoute + admin.updateEntry
  - `DELETE /api/entries/:id` → protectRoute + admin.deleteEntry
  - `POST /api/match` → protectRoute + admin.searchTMDB

### Frontend Files

**`src/pages/AdminLogin.jsx`** (~80 lines)
- Form login (username, password)
- State: username, password, error
- Handle submit: POST /admin/login
- On success: redirect ke /admin
- On error: tampilkan error

**`src/pages/Admin.jsx`** (~150 lines)
- State: entries, filterStatus, loading, error
- Effect: fetch entries on mount + when filter changes
- Render: header + filter + list entries + empty state
- Actions: delete entry (with confirm), navigate to edit

**`src/pages/AdminEntry.jsx`** (~200 lines)
- State: mode (create/edit), form data, search query, search results, loading, error
- If edit mode: fetch entry by ID, pre-fill form
- Auto-match section: input + search button + results grid
- Form fields: type, tmdb_id, video_url, video_type, status
- Handle submit: POST (create) atau PUT (edit)
- Validation: required fields, URL format

**`src/components/AdminLayout.jsx`** (~60 lines)
- Navbar: logo + logout button
- Children: render outlet
- Logout handler: POST /admin/logout + clear cookie + redirect ke /admin/login

**`src/lib/api.js`** (modified, +50 lines)
- Tambah helper:
  - `adminFetch(path, options)` — fetch dengan credentials: 'include' + parse JSON
  - `adminGet(path)` — GET request
  - `adminPost(path, data)` — POST request
  - `adminPut(path, data)` — PUT request
  - `adminDelete(path)` — DELETE request

**`src/App.jsx`** (modified)
- Tambah routes admin:
  - `/admin/login` → AdminLogin
  - `/admin` (protected) → AdminLayout → Admin
  - `/admin/entry` (protected) → AdminLayout → AdminEntry (create)
  - `/admin/entry/:id` (protected) → AdminLayout → AdminEntry (edit)

---

## 10. Testing & Validation

### Manual Test Checklist

1. **Login**
   - Buka `/admin` → redirect ke `/admin/login` ✅
   - Input wrong credentials → error message ✅
   - Input correct credentials → redirect ke `/admin` ✅
   - Cookie `admin_session` ada di DevTools ✅

2. **List Entries**
   - Buka `/admin` → lihat daftar entries (jika ada seed data) ✅
   - Filter by status (Draft/Published) → list ter-filter ✅
   - Empty state → "Belum ada entri" ✅

3. **Create via Auto-match**
   - Klik "Tambah Entri Baru" → form kosong ✅
   - Input "Fight Club" → klik "Cari TMDB" → hasil muncul ✅
   - Klik "Pilih" pada result → form ter-isi ✅
   - Submit → entry created → redirect ke list ✅

4. **Create Manual**
   - Input TMDB ID 550 + type Movie → submit → entry created ✅
   - Title auto-fetched dari TMDB ✅

5. **Edit Entry**
   - Klik Edit pada entry → form pre-filled ✅
   - Ubah status ke Draft → simpan → verify updated ✅
   - Ubah video_url → simpan → verify updated ✅

6. **Delete Entry**
   - Klik Delete → konfirmasi dialog → entry hilang dari list ✅
   - Verify catalog.json updated ✅

7. **Logout**
   - Klik Logout → cookie dihapus → redirect ke `/admin/login` ✅
   - Refresh page → tetap di login (tidak bisa akses /admin) ✅

8. **Session Expiry**
   - Login → tunggu sampai timeout → refresh → redirect ke `/admin/login` ✅

9. **Edge Cases**
   - Duplicate tmdb_id → error 409 ✅
   - Invalid video_url → validation error ✅
   - TMDB API error → error message ✅
   - Search empty → "Tidak ada hasil" ✅

### Browser Test
- Navigasi: `/admin` → login → list → tambah → edit → logout
- Verify cookie `admin_session` ada di DevTools → Application → Cookies
- Verify catalog.json updated setelah create/edit/delete
- Test di mobile viewport (responsive)

---

## 11. Dependencies & Environment

### New Dependencies (backend)
- Tidak ada dependency baru — menggunakan module yang sudah ada (`fs`, `crypto`, `express`, `https`/`fetch`)

### Environment Variables
```
ADMIN_USER=admin
ADMIN_PASS=password123
ADMIN_SESSION_TIMEOUT=24
```

### Catalog.json Schema Changes
- Tambah field `sessions` array di root catalog.json
- Existing `entries` array tetap sama, hanya tambah field `id`, `created_at`, `updated_at` ke setiap entry yang belum ada

---

## 12. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Credentials hardcoded | Pakai env vars (`ADMIN_USER`, `ADMIN_PASS`) |
| Session hijacking | httpOnly cookie + random token + timeout |
| XSS | React auto-escape + httpOnly cookie |
| CSRF | sameSite: 'lax' + POST-only untuk mutation |
| TMDB API key exposure | Proxy via backend, frontend tidak pernah see API key |
| Path traversal | Validate `id` parameter, tidak allow `../` |
| Rate limiting (future) | Belum diimplementasi versi pertama, bisa tambah `express-rate-limit` nanti |

---

## 13. Out of Scope (Versi Pertama)

- Multi-admin dengan role berbeda (single admin only)
- Upload file video (hanya input URL)
- Subtitle management
- Rekomendasi personalisasi
- Audit log / history changes
- Password hashing (env-based plain text untuk v1, bisa upgrade ke bcrypt nanti)
- Rate limiting
- Email notification

---

## 14. Success Criteria

1. Admin bisa login via `/admin/login` dengan env credentials
2. Admin bisa lihat daftar entries di `/admin`
3. Admin bisa tambah entry via auto-match TMDB
4. Admin bisa tambah entry manual (input TMDB ID)
5. Admin bisa edit entry (ubah status, video_url)
6. Admin bisa hapus entry
7. Session berakhir setelah timeout, redirect ke login
8. Catalog.json ter-update setelah setiap mutation
9. Frontend admin responsive di mobile

---

**Design approved by user on 2026-08-15.**
