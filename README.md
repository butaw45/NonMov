# Seluloid

Katalog & streaming film/series berbasis **TMDB** dengan nuansa bioskop klasik — frontend
publik dari PRD `docs/prd-tmdb-netflix-clone.md`.

> Brand, palet, dan tipografi dipilih sendiri (Fraunces + Manrope, hitam hangat + amber
> lampu proyektor) supaya situs punya identitas — bukan template streaming generik.

## Fitur (sesuai PRD)

| Status | Fitur |
| --- | --- |
| ✅ P0 | Homepage: hero + trending, Top 10, film/series populer, rating tertinggi, kurasi horor |
| ✅ P0 | Search multi (film & series) dengan debounce + riwayat pencarian lokal |
| ✅ P0 | Halaman detail: poster, sinopsis, cast, rating, trailer, daftar season & episode |
| ✅ P0 | Tombol "Tonton di [platform legal]" via TMDB watch-providers (region ID) |
| ✅ P0 | Halaman player `/tonton/:type/:id` (ArtPlayer + hls.js, HLS/DASH) — auto-resolve dari `server/catalog.json` |
| ✅ P0 | Panel admin `/admin`: login, CRUD katalog, auto-match TMDB |
| ✅ P1 | Watchlist tersimpan di localStorage browser |
| ✅ P1 | Rekomendasi personal dari judul yang disimpan |
| ✅ P1 | Filter lanjutan di /jelajah: tipe, genre, tahun, urutkan |

Panel admin & status draft/publish butuh backend — belum termasuk di frontend ini.

## Menjalankan

### Frontend saja (tanpa backend)

```bash
npm install

# isi API key TMDB (gratis): https://www.themoviedb.org/settings/api
# salin .env.example menjadi .env lalu isi:
#   VITE_TMDB_API_KEY=xxxxxxxx
npm run dev      # http://localhost:5173
```

Tanpa API key, situs menampilkan layar panduan pengisian (bukan halaman rusak).

### Frontend + backend (opsi B — direkomendasikan)

Backend minimal di folder `server/` berfungsi sebagai proxy TMDB (API key tersembunyi
dari browser) dan menyajikan katalog konten custom dari `server/catalog.json`.

```bash
# 1. Jalankan backend (butuh Node 20+)
cd server
npm install
cp .env.example .env   # isi TMDB_API_KEY kamu
npm run dev            # http://localhost:4001

# 2. Di terminal lain, jalankan frontend (otomatis proxy /3 dan /api ke backend)
cd ..
npm run dev            # http://localhost:5173
```

Dengan backend berjalan, halaman `/tonton/{type}/{id}` akan otomatis memutar
`video_url` dari `server/catalog.json` jika ada entri yang cocok.

## Menambah konten custom

Gunakan panel admin di `/admin` (butuh backend berjalan + `ADMIN_USER`/`ADMIN_PASS` di `server/.env`).
Login → "Tambah Entri Baru" → cari judul TMDB → pilih hasil → isi URL video → Simpan.

Backend menulis ulang `server/catalog.json` setiap perubahan — tidak perlu restart.

## Struktur

```
src/
  lib/        # klien TMDB (+cache), klien Admin API, watchlist localStorage, history, util & hooks
  components/ # Navbar, Hero, Row, PosterCard, AdminLayout, Skeleton, ikon SVG custom, dll.
  pages/      # Home, Browse, Search, Detail, Watch, Watchlist, Setup, NotFound, Admin, AdminEntry, AdminLogin
  styles/     # design system dipecah per lapisan (tokens → layout → komponen → halaman)
server/
  index.js      # backend Express: proxy TMDB + /api/catalog + /admin/api/* + static dist/ (produksi)
  admin.js      # business logic admin (auth sesi, CRUD entri, auto-match TMDB)
  adminRoutes.js # Express router /admin/api/* (proteksi cookie admin_session)
  catalog.json  # katalog konten custom { entries, sessions } (kelola via /admin)
```

## Catatan arsitektur

- Permintaan TMDB di-cache (memori + sessionStorage, TTL 5 menit) dan poster di-lazy-load.
- Halaman Detail & Watch di-code-split (lazy) — bundle awal ringan.
- Bahasa metadata `en-US` (sumber utama lengkap), region watch-provider `ID`.
- Backend opsi B sudah tersedia: proxy TMDB + katalog JSON di `server/`.

## Peta jalan

1. ~~Panel admin: tambah/edit entri catalog lewat UI~~ ✅ sudah ada di `/admin`.
2. Upload video ke layanan HLS/DASH langsung dari panel admin.
3. P2: pilihan subtitle.

---

Produk ini memakai API TMDB tetapi tidak didukung atau disertifikasi oleh TMDB.
