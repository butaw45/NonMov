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
| ✅ P0 | Halaman player `/tonton/:type/:id` (ArtPlayer + hls.js, HLS/DASH) — URL stream menyusul dari backend |
| ✅ P1 | Watchlist tersimpan di localStorage browser |
| ✅ P1 | Rekomendasi personal dari judul yang disimpan |
| ✅ P1 | Filter lanjutan di /jelajah: tipe, genre, tahun, urutkan |

Panel admin & status draft/publish butuh backend — belum termasuk di frontend ini.

## Menjalankan

```bash
npm install

# isi API key TMDB (gratis): https://www.themoviedb.org/settings/api
# salin .env.example menjadi .env lalu isi:
#   VITE_TMDB_API_KEY=xxxxxxxx
npm run dev      # http://localhost:5173
```

Tanpa API key, situs menampilkan layar panduan pengisian (bukan halaman rusak).

Tanpa backend, halaman tonton tetap bisa dicoba dengan parameter `?src=`:
`/tonton/movie/603?src=https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`

## Struktur

```
src/
  lib/        # klien TMDB (+cache), watchlist localStorage, util & hooks
  components/ # Navbar, Hero, Row, PosterCard, Skeleton, ikon SVG custom, dll.
  pages/      # Home, Browse, Search, Detail, Watch, Watchlist, Setup, NotFound
  styles/     # design system dipecah per lapisan (tokens → layout → komponen → halaman)
```

## Catatan arsitektur

- Permintaan TMDB di-cache (memori + sessionStorage, TTL 5 menit) dan poster di-lazy-load.
- Halaman Detail & Watch di-code-split (lazy) — bundle awal ringan.
- Bahasa metadata `id-ID`, region watch-provider `ID`.
- Untuk produksi: proxied-kan TMDB lewat backend supaya API key tidak terekspos di browser.

## Peta jalan

1. Backend internal: entri katalog (status draft/publish), auth admin, auto-match TMDB.
2. Frontend admin panel (tambah/edit entri, review match, upload video ke layanan HLS/DASH).
3. Sambungkan halaman Watch ke URL stream dari katalog internal.
4. P2: continue watching, pilihan subtitle.

---

Produk ini memakai API TMDB tetapi tidak didukung atau disertifikasi oleh TMDB.
