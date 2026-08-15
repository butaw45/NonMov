# Rancangan Integrasi viduki.net + Dual Player
## Status: DESIGN ONLY — Belum diimplementasi

---

## 1. Tujuan

- **Mengganti workflow `video_url` manual** dengan embed API viduki.net yang otomatis (TMDB ID → embed URL).
- **Mempertahankan ArtPlayer** untuk konten self-hosted (Mux/Bunny/dll) — tetap bisa kontrol UI/quality/subtitle.
- **Dual player di halaman `/tonton`**: otomatis pilih ArtPlayer atau iframe viduki berdasarkan jenis konten.
- **Fallback otomatis** antar API viduki (1→2→3→4) kalau server gagal.

---

## 2. Arsitektur Saat Ini vs Baru

### Saat Ini
```
AdminEntry (form manual)
  └─ Admin paste video_url (HLS .m3u8)
      └─ Simpan ke catalog.json → video_url
          └─ Watch.jsx → ArtPlayer(src=video_url)
```

### Baru
```
AdminEntry (auto-match + pilih provider)
  └─ Simpan ke catalog.json
      ├─ video_provider: "self" | "viduki"
      ├─ video_url: "...m3u8" (self) ATAU viduki_api: 2 (viduki)
      └─ viduki_type: "tv" | "movie"
          └─ Watch.jsx
              ├─ video_provider === "viduki" → <IframePlayer viduki_url>
              │     └─ fallback: API 1 → 2 → 3 → 4 via postMessage
              └─ video_provider === "self" → <ArtPlayer src=video_url>
```

---

## 3. Perubahan Data Model (`catalog.json`)

### Field Baru
```jsonc
{
  // existing fields...
  "video_provider": "self",        // STRING: "self" | "viduki"
  "video_url": "",                 // STRING: HLS/DASH URL (self-hosted only)
  "video_type": "hls",            // STRING: "hls" | "dash" | "mp4" (self-hosted only)

  // viduki-specific (hanya diisi kalau video_provider === "viduki")
  "viduki_api": 2,                 // NUMBER: 1|2|3|4 (default: 2 = Multi Language)
  "viduki_type": "tv",             // STRING: "tv" | "movie"
  "viduki_color": "#ef4444"        // STRING: hex color untuk tema player (opsional)
}
```

### Validasi
- **`video_provider === "self"`**: wajib ada `video_url`
- **`video_provider === "viduki"`**: wajib ada `tmdb_id` + `viduki_type` + `viduki_api`
- Backend validasi saat simpan via `/admin/api/entries` POST/PUT

---

## 4. Rancangan Komponen

### 4.1 `src/components/IframePlayer.jsx` (BARU)
**Tujuan**: Render iframe viduki + handle fallback API + postMessage listener.

Props:
```tsx
interface IframePlayerProps {
  api: number;        // 1-4, default 2
  tmdbId: number;     // TMDB ID (atau string IMDB ID)
  type: 'tv' | 'movie';
  season?: number;    // TV only, default 1
  episode?: number;   // TV only, default 1
  color?: string;     // hex color, default '#ef4444'
  onError?: (msg) => void;
}
```

State:
- `currentApi: number` — API aktif (update saat fallback)

Effect:
- `postMessage` listener untuk `viduki:all-servers-failed`
- Kalau `currentApi < 4` → increment + reload iframe
- Kalau `currentApi === 4` → callback `onError` → fallback UI (tombol buka di tab baru)

Render:
```jsx
<iframe
  src={`https://viduki.net/${currentApi}/${type}/${tmdbId}${season ? `/${season}/${episode}` : ''}?color=${encodeURIComponent(color || '#ef4444')}`}
  allowFullScreen
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  style={{ width: '100%', aspectRatio: '16/9', border: 0 }}
/>
```

### 4.2 Modifikasi `src/pages/Watch.jsx`
**Tujuan**: Switch player sesuai `video_provider`.

Langkah:
1. Tambah state `entry` — load dari `/admin/api/entries/{id}` atau decode dari catalog frontend.
2. Conditional render:
   ```jsx
   if (entry?.video_provider === 'viduki') {
     return <IframePlayer 
       api={entry.viduki_api}
       tmdbId={entry.tmdb_id}
       type={entry.viduki_type}
       season={season}
       episode={episode}
       color={entry.viduki_color}
       onError={handleVidukiError}
     />
   }
   // ... existing ArtPlayer code
   ```
3. Tambah fallback UI kalau semua API gagal:
   ```jsx
   {allFailed && (
     <div className="player-fallback">
       <p>Stream gagal dimuat di semua server.</p>
       <a href={fallbackUrl} target="_blank" rel="noreferrer">
         Buka di viduki.net
       </a>
     </div>
   )}
   ```

### 4.3 Modifikasi `src/pages/AdminEntry.jsx`
**Tujuan**: Form tambah/edit entri dengan pilihan provider.

UI Changes:
- **Radio button "Jenis Konten"**:
  - ○ Self-hosted (Mux/Bunny/dll) → tampilkan field `video_url` + `video_type`
  - ○ viduki.net (API embed) → tampilkan field `viduki_api` (dropdown 1-4) + auto-fill `tmdb_id` dari match

Logic:
- **Auto-match TMDB**: Setelah admin pilih hasil match → otomatis set `tmdb_id`, `viduki_type` (tv/movie), dan generate embed URL preview.
- **Preview embed**: Tampilkan iframe kecil untuk preview sebelum simpan.

Field baru di form:
```tsx
// Tampil kalau pilih viduki
<select name="viduki_api">
  <option value="1">API 1 — Multi Server</option>
  <option value="2" selected>API 2 — Multi Language</option>
  <option value="3">API 3 — Multi Embeds</option>
  <option value="4">API 4 — Premium Embeds</option>
</select>
```

### 4.4 Modifikasi `src/pages/Detail.jsx`
**Tujuan**: Tombol "Tonton Sekarang" konsisten untuk kedua provider.

**Tidak ada perubahan signifikan** — logic yang sudah ada (cek history → ke Watch) tetap jalan. `Watch.jsx` yang handle switch player.

Catatan: Untuk **viduki entries**, tombol "Tonton Sekarang" mengirim ke `/tonton/{type}/{id}?season={s}&episode={e}` — sama seperti self-hosted. Watch.jsx load entry dari catalog, detect provider, render player yang sesuai.

---

## 5. Rancangan Backend

### 5.1 `server/catalog.json` — Schema Update
Validasi saat save:
```js
// pseudo-code
function validateEntry(entry) {
  if (entry.video_provider === 'viduki') {
    if (!entry.tmdb_id) throw 'tmdb_id wajib untuk viduki';
    if (!['tv','movie'].includes(entry.viduki_type)) throw 'viduki_type invalid';
    if (![1,2,3,4].includes(entry.viduki_api)) throw 'viduki_api harus 1-4';
    // clear self fields
    entry.video_url = '';
    entry.video_type = '';
  } else {
    if (!entry.video_url) throw 'video_url wajib untuk self-hosted';
    // clear viduki fields
    entry.viduki_api = null;
    entry.viduki_type = null;
    entry.viduki_color = null;
  }
  return entry;
}
```

### 5.2 `server/adminRoutes.js` — Endpoint Update
**Tidak ada endpoint baru**. `POST /admin/api/entries` dan `PUT /admin/api/entries/:id` sudah menerima full JSON body — tinggal tambah validasi field baru.

Response include `video_provider` + viduki fields agar frontend bisa decide player type.

### 5.3 `server/admin.js` — Business Logic
- Tambah `validateEntry()` helper (schema validasi).
- Saat create/update entry → panggil validasi.
- Saat delete entry → tidak ada perubahan (tidak ada resource eksternal untuk dihapus — viduki auto-manage).

---

## 6. Rancangan Fallback Logic

### PostMessage Contract (viduki → parent)
```js
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://www.viduki.net') return;
  if (event.data?.type === 'viduki:all-servers-failed') {
    // payload:
    // { type, source, stage, status, message, media: { type, tmdbid, season?, episode? } }
    handleFallback(event.data);
  }
});
```

### Fallback Flow
1. API 2 gagal → `currentApi` naik ke 3 → reload iframe
2. API 3 gagal → `currentApi` naik ke 4 → reload iframe
3. API 4 gagal → tampilkan UI fallback:
   - Tombol "Buka di viduki.net" (link `/4/{type}/{tmdbId}...`)
   - Tombol "Coba server lain manual" (dropdown API 1-4)
   - Pesan error detail

### Auto-retry
- Jangan auto-retry API yang sama (staging `initial` vs `playback-error` beda handling).
- Stage `manual-switch` = user pilih server lain, jangan auto-increment lagi.

---

## 7. File yang Akan Diubah/Dibuat

| File | Aksi | Deskripsi |
|------|------|-----------|
| `src/components/IframePlayer.jsx` | **BARU** | Component iframe viduki + fallback listener |
| `src/pages/Watch.jsx` | MODIFY | Switch player (ArtPlayer vs IframePlayer) + fallback UI |
| `src/pages/AdminEntry.jsx` | MODIFY | Form field baru (provider select, viduki_api dropdown, preview) |
| `server/admin.js` | MODIFY | Validasi schema entry baru |
| `server/adminRoutes.js` | MODIFY | Pastikan response include viduki fields |
| `server/catalog.json` | MODIFY | Seed entries lama migrasi (default `video_provider: "self"`) |
| `src/lib/api.js` | MODIFY | Helper `resolveWatchUrl(entry)` untuk generate URL tontonan |
| `AGENTS.md` | MODIFY | Update Struktur section |

File yang **TIDAK BERUBAH**:
- `src/pages/Detail.jsx` — logic tombol "Tonton Sekarang" tetap sama
- `src/components/ContinueRow.jsx` — tetap sama
- `src/lib/history.js` — tetap sama
- `ArtPlayer` integration — tetap sama untuk self-hosted

---

## 8. Migrasi Data Existing

Semua entries lama di `catalog.json` yang **tidak punya** `video_provider` → dianggap `"self"` (backward compatible).

Contoh migrasi:
```json
// SEBELUM
{ "id": "550-movie-seed1", "video_url": "https://...", "video_type": "hls" }

// SESUDAH
{ 
  "id": "550-movie-seed1", 
  "video_provider": "self",
  "video_url": "https://...", 
  "video_type": "hls",
  "viduki_api": null,
  "viduki_type": null
}
```

Backend migration script (one-time, bisa di-handle via startup check).

---

## 9. Testing Checklist (setelah implementasi)

| # | Skenario | Expected |
|---|----------|----------|
| 1 | Admin pilih viduki → simpan → entry muncul di list | ✅ Tampil badge "viduki API 2" |
| 2 | Viewer klik "Tonton Sekarang" entry viduki | ✅ Navigasi ke Watch → iframe viduki load |
| 3 | Viewer klik "Tonton Sekarang" entry self | ✅ Navigasi ke Watch → ArtPlayer load |
| 4 | viduki API 2 gagal (simulasi) | ✅ Auto fallback ke API 3 → 4 |
| 5 | Semua API gagal | ✅ Tampilkan UI fallback + link buka di tab baru |
| 6 | Admin edit entry self → ganti ke viduki | ✅ Validasi video_url di-clear, viduki fields terisi |
| 7 | Admin edit entry viduki → ganti ke self | ✅ Validasi viduki fields di-clear, video_url wajib |
| 8 | Backward compat: buka entry lama tanpa `video_provider` | ✅ Dianggap `"self"`, ArtPlayer tetap jalan |
| 9 | Movie entry viduki (tanpa season/episode) | ✅ Embed URL `/2/movie/{tmdb_id}` |
| 10 | TV entry viduki dengan season/episode custom | ✅ Embed URL `/2/tv/{tmdb_id}/{s}/{e}` |

---

## 10. Pertanyaan Terbuka (sebelum implementasi)

| # | Pertanyaan | Dampak |
|---|------------|--------|
| 1 | **Pilih warna brand viduki atau custom?** | Default `#ef4444` (merah viduki) atau izinkan admin custom? |
| 2 | **Preview iframe di AdminEntry** — show/hide toggle? | Default ON (nyaman preview), tapi tambah toggle karena iframe bisa lambat load. |
| 3 | **Auto-fallback ON/OFF** — default aktif? | Default ON (otomatis), tapi bisa dimatikan via toggle di Watch. |
| 4 | **Entry self-hosted → ganti ke viduki**: hapus `video_url` lama atau backup? | Hapus (replace), karena `video_provider` yang menentukan source. |

---

## 11. Timeline Estimate

| Phase | Estimasi |
|-------|----------|
| Design review (file ini) | — |
| IframePlayer component | 30 menit |
| Watch.jsx switch logic | 45 menit |
| AdminEntry.jsx form update | 60 menit |
| Backend validation | 30 menit |
| Data migration (seed) | 15 menit |
| Browser testing | 30 menit |
| Commit + push | 15 menit |
| **Total** | **~3.5 jam** |

---

*Dokumen ini dibuat pada 2026-08-15. Implementasi dimulai setelah approval user.*
