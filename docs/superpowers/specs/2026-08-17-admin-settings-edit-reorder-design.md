# Rancangan: Edit & Reorder Provider Global (AdminSettings) — Iterasi #2

> **Status: DESIGN/REVIEW ONLY — BELUM DIIMPLEMENTASI.**
> Feedback pada `/admin/settings` (iterasi #1 Embed Template Registry, merged via PR #20):
> *"Buat agar yang sudah ada bisa diedit, dan bisa di reorder. buat planing dulu. jangan di IMPLEMENTASI. buatkan previewnya dulu."*
> Preview interaktif: `tmp-issue21-preview.html` (root repo).

## 1. Ringkasan

Form "Provider Global" di `src/pages/AdminSettings.jsx` saat ini hanya mendukung **Tambah**, **toggle Aktif**, dan **Hapus**. Iterasi ini menambah dua kemampuan pada provider pool global:

1. **Edit provider yang sudah ada** (inline per row) — ubah label, media type, kedua URL template, status Aktif.
2. **Reorder / urutkan ulang** provider (tombol panah atas/bawah) — menentukan urutan tampil di dropdown player halaman Watch.

## 2. Keputusan desain (dari user)

| Aspek | Keputusan |
|---|---|
| UX edit | **Inline per row** — klik "Ubah" → row berubah jadi form edit; Simpan/Batal. Tanpa modal. |
| Mekanisme reorder | **Tombol panah atas/bawah** per row (↑ ↓). Tanpa drag-and-drop (simple & aksesibel). |
| Lingkup | Client-side hanya di `AdminSettings.jsx`. **Tanpa perubahan skema config, server, atau Watch.** |

## 3. Arsitektur perubahan

### 3.1 State baru (di `AdminSettings.jsx`)

```text
editingIndex  : int|null      // index row yang sedang diedit; null = tak ada
editDraft     : object|null   // salinan {label, media_type, movie_url, tv_url, enabled}
```

### 3.2 Interaksi edit (inline)

- Setiap row non-editing diberi tombol **"Ubah"** di samping "Hapus".
- Klik "Ubah" → `editingIndex = i`, `editDraft = {...providers[i]}`; row `i` dirender sebagai **form inline** (bukan list):
  - Label (text)
  - Media Type (select: '' = Movie+TV | movie | tv)
  - URL Template Movie (text, wajib + `{tmdb_id}`)
  - URL Template TV (text; wajib bila media_type ≠ 'movie')
  - Aktif (toggle)
  - Tombol **Simpan** & **Batal**
- **Simpan**: validasi client sama persis seperti form "Tambah" (pesan Indonesia). Lolos → `providers[i]` di-update dari `editDraft`, `editingIndex = null`. **Belum** menulis ke server — menunggu tombol "Simpan Pengaturan" (konsisten dgn alur Tambah).
- **Batal**: `editingIndex = null` (draft dibuang).
- Selama row sedang diedit, tombol "Ubah" ditandai aktif (btn-primary/ghost aktif) & tombol panah/Hapus dinonaktifkan (mencegah reorder/delete row yang sedang diedit).

### 3.3 Interaksi reorder (tombol panah)

- Tiap row non-editing mendapat tombol **↑** dan **↓** (btn-ghost btn-sm).
- `onMove(i, dir)`: swap posisi `i` dan `i±1` di array `providers`. `dir=+1` turun, `dir=-1` naik.
- Disable aturan tepi: ↑ nonaktif di index 0; ↓ nonaktif di index terakhir.
- Urutan array akan dikirim utuh saat "Simpan Pengaturan" → array order = urutan tampil di dropdown Watch (lewat `resolveProviders`, yang tak diubah).

### 3.4 Tidak berubah

- **Tidak ada** perubahan skema `providers[]` (`type/id/label/media_type/movie_url/tv_url/enabled`).
- **Tidak ada** perubahan `server/config.js`, `server/admin.js`, `src/lib/providers.js`, `src/pages/Watch.jsx`.
- **Tidak ada** dependency baru (tanpa library drag).
- id provider **dipertahankan** saat edit/save (server hanya membuat id utk item baru — alur `onSave` existing sudah menangani ini).

## 4. Validasi (reuse logika "Tambah")

Fungsi validasi yang dipakai form Tambah dir-faсtor jadi helper `validateTemplate(movie, tv, mediaType)` agar edit & tambah konsisten:

- `movie.trim()` non-empty + mengandung `{tmdb_id}` → error: *"URL Template Movie wajib diisi dan memuat placeholder {tmdb_id}."*
- `mediaType !== 'movie'` dan `tv.trim()` kosong → error: *"URL Template TV wajib diisi bila Media Type bukan Movie."*

## 5. Cleanup / catatan kecil

- Hapus state form Tambah yang tidak diperlukan ulang (tetap dipakai utk Tambah).
- Trigger re-render murni React state (`setProviders`); tanpa mutation array langsung.

## 6. Kriteria penerimaan

- [ ] Klik "Ubah" pada provider existing opens form inline; field terisi nilai saat ini; batal mengembalikan tanpa perubahan.
- [ ] Edit label/media/URL/Aktif lalu Simpan → row ter-update; urutan posisi tidak berubah; id dipertahankan.
- [ ] Validasi edit identik dgn tambah (placeholder & TV-wajib) — error Indonesia inline.
- [ ] Tombol ↑/↓ memindahkan urutan provider; disabled di tepi; urutan baru tercermin di dropdown Watch (Movie+TV masing-masing) setelah "Simpan Pengaturan".
- [ ] Row yang sedang diedit: panah & Hapus nonaktif.
- [ ] `npm run build` lulus; smoke admin (login + save) jalan.

## 7. Non-goals (fase ini)

- **Bukan** drag-and-drop.
- **Bukan** edit inline utk provider self per-judul (di `AdminEntry`) — di luar scope, ke depan.
- **Bukan** rename/struktur skema config.

## 8. Implementasi (referensi, JANGAN dieksekusi di iterasi ini)

Konteks file: `src/pages/AdminSettings.jsx` (~222 baris). Perubahan terbatas pada komponen render row `providers.map(...)` + penambahan state & handler `onEditBegin/onEditSave/onEditCancel` + `onMove`. Lihat preview `tmp-issue21-preview.html` untuk tata letak yang dituju.

---

**Preview**: `tmp-issue21-preview.html` — mock interaktif yang menggambarkan row biasa, row dalam mode edit inline, dan tombol reorder panah (dgn disabled di tepi).
