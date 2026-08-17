# PRD: Platform Katalog & Streaming Film/Series (Berbasis TMDB)

> **Status dokumen (diperbarui 2026-08-17):** PRD ini sudah di-amend agar mencerminkan
> fitur yang terimplementasi. Bagian yang berubah dari PRD asli ditandai **[AMEND]**.
> Riwayat implementasi per fitur: lihat PR/issue yang dirujuk di catatan perubahan.

## Problem Statement
Belum ada platform yang menyatukan koleksi film/series yang dimiliki atau dilisensi secara
pribadi ke dalam satu tampilan yang rapi dan familiar, setara pengalaman menonton di Netflix.
Pemilik konten (hasil produksi sendiri, rekaman, atau konten berlisensi) selama ini hanya punya
folder file biasa atau player generik tanpa metadata yang informatif. Dengan mengintegrasikan
data TMDB (poster, sinopsis, cast, rating, daftar episode) ke dalam UI bergaya Netflix, publik
bisa menjelajah dan menonton koleksi tersebut dengan pengalaman yang jauh lebih baik.

## Goals
1. Publik bisa browse, cari, dan menemukan film/series lewat kategori, trending, dan search dengan cepat.
2. Setiap judul dilengkapi metadata TMDB lengkap (poster, sinopsis, cast, rating; daftar season/episode untuk series).
3. Admin bisa menambah & mempublikasikan konten baru lewat alur simpel, dengan matching ke TMDB otomatis + review manual.
4. Konten yang dimiliki/dilisensi sendiri bisa diputar langsung di web lewat adaptive streaming
   (HLS) dengan player estetis (ArtPlayer). **[AMEND]** Selain itu, konten bisa diputar lewat
   **provider embed pihak ketiga** (URL template) sebagai sumber tontonan alternatif.
5. Konten yang tidak dihost sendiri diarahkan ke platform legal via data TMDB watch-providers,
   sehingga situs tetap sepenuhnya legal.

## Non-Goals
- **Tidak** menghost atau mendistribusikan film/series berhak cipta yang bukan milik/lisensi
  admin — untuk konten tersebut situs murni katalog info + link keluar ke platform legal.
- Tidak menyediakan upload oleh sembarang user (UGC) — hanya admin yang bisa menambah konten.
- Tidak membangun aplikasi mobile native di versi awal — fokus web responsive.
- Tidak membangun sistem akun/login untuk viewer publik di versi awal — watchlist versi awal
  disimpan local ke browser.
- **[AMEND]** Tidak menyediakan upload file video ke server utama. Konten "self-hosted"
  ditautkan lewat URL stream eksternal (HLS `.m3u8`) atau embed URL — bukan di-upload ke server
  ini.

## Pendekatan Solusi
Arsitektur hybrid: TMDB API sebagai sumber metadata, dikombinasikan dengan katalog internal
yang menyimpan status tiap judul. **[AMEND]** Sumber tontonan per judul diresolusi lewat
**registri provider** (`src/lib/providers.js`, `resolveProviders`) dengan urutan:

1. **Override self per-entri** — provider `self` di entri (ArtPlayer untuk file HLS, iframe untuk
   `video_type: 'embed'`).
2. **Flat self legacy** — field `video_provider:'self'` + `video_url` (backward compat).
3. **Pool provider global** — provider `embed` di `server/config.json` yang `enabled` dan cocok
   `media_type`. Tiap provider global berupa URL template `{tmdb_id}/{season}/{episode}`.
4. **Kosong** — fallback: hanya tombol "Tonton di platform legal" (TMDB watch-providers).

Komponen utama: (1) frontend web responsive (browse, search, detail, player); (2) backend/API
internal — entri katalog, auto-match TMDB, otentikasi admin, plus **proxy TMDB dengan cache
in-memory TTL 2 kelas**; (3) sumber video eksternal (URL stream HLS untuk konten milik sendiri,
atau embed URL pihak ketiga); (4) ArtPlayer sebagai player file; (5) iframe generik untuk embed.

Untuk konten yang bukan milik/lisensi sendiri, situs tidak menyimpan video apa pun — menampilkan
info katalog + link legal. **[AMEND]** Provider embed pihak ketiga adalah sumber tontonan
eksternal yang dikelola admin; legalitasnya tanggung jawab admin saat menambah provider.

## User Flow

**Viewer (publik, tanpa login):** buka situs → browse/search/trending → pilih judul → halaman
detail → halaman **Watch**. **[AMEND]** Bila ada lebih dari satu provider, viewer memilih lewat
dropdown provider; konten diputar di ArtPlayer (file self) atau iframe (embed). Bila tidak ada
provider, tombol "Tonton di [platform legal]" mengarah keluar.

**Admin (login terpisah):** login → tambah entri baru → auto-match TMDB (review manual) →
tautkan sumber video (URL stream HLS atau embed, atau link-only) → publish. **[AMEND]** Admin
juga mengelola **pool provider global** di `/admin/settings` (tambah/edit/reorder/toggle), dan
mengatur override self per-entri di `/admin/entry`.

```mermaid
flowchart TD
    A[Viewer buka situs] --> B[Browse / Search / Trending]
    B --> C[Pilih judul]
    C --> D[Halaman detail: sinopsis, cast, rating, episode list]
    D --> W[Halaman Watch]
    W --> E{Sumber tontonan resolveProviders}
    E -- Self file HLS --> F[Player ArtPlayer HLS]
    E -- Self embed --> G[Iframe embed]
    E -- Pool global embed --> G
    E -- Tidak ada --> H[Tombol Tonton di platform legal]
    H --> I[Redirect ke provider legal - TMDB watch-providers]

    subgraph Admin Flow
    J[Admin login] --> K[Tambah entri baru]
    K --> L[Auto-match judul ke TMDB]
    L --> M{Match akurat?}
    M -- Ya --> N[Konfirmasi data TMDB]
    M -- Tidak --> O[Review manual, pilih match yang benar]
    O --> N
    N --> P{Tautkan sumber video}
    P -->|URL stream HLS / embed per-entri| Q[Atur provider self entri]
    P -->|Link-only| R[Tandai link-only]
    Q --> S[Publish entri]
    R --> S
    J --> T[/admin/settings: kelola pool provider global]
    end
```

## Requirements

### P0 — Must Have
1. **Browse & Discover** — ✅ done
   - [x] Homepage tampil trending & kategori dari TMDB
   - [x] Search mengembalikan hasil film/series relevan
2. **Halaman Detail** — ✅ done
   - [x] Poster, sinopsis, cast, rating dari TMDB
   - [x] Series: daftar season & episode, klikable ke player (issue #3)
3. **Admin Panel — CRUD Entri** — ✅ done (issue #6)
   - [x] Login admin, panel terbatas non-admin
   - [x] Auto-match judul ke TMDB + koreksi manual
4. **Play Video (konten milik sendiri)** — ✅ sebagian **[AMEND]**
   - [x] ArtPlayer memutar stream HLS (`.m3u8`) dari URL self per-entri
   - [x] Self `video_type:'embed'` dirender sebagai iframe
   - [ ] **GAP vs PRD asli:** upload file video ke layanan streaming HLS/DASH belum diimplementasi
     (konten self ditautkan lewat URL, bukan di-upload lewat UI). Diputuskan non-goal: tidak ada
     upload ke server.
5. **Link ke Platform Legal** — ✅ done
   - [x] Tombol "Tonton di [platform]" via TMDB watch-providers tampil di halaman Watch
6. **Status Draft/Publish** — ✅ done (issue #12)
   - [x] Entri `status:'draft'` disaring dari public API `/api/catalog`

### **[AMEND] Provider — dimensi baru di luar PRD asli**
7. **Registri provider** (issue #19) — ✅ done
   - [x] Satu resolver `resolveProviders(entry, config, kind)` dengan urutan override → legacy → pool global
   - [x] Provider embed = URL template `{tmdb_id}/{season}/{episode}`; `buildEmbedUrl` mengisi placeholder
8. **Pool provider global** (issue #10, #19) — ✅ done
   - [x] `server/config.json` menyimpan array provider embed `{id,label,movie_url,tv_url,media_type,enabled}`
   - [x] Migrasi otomatis seed viduki saat pertama jalan
9. **Selector provider di player** (issue #13) — ✅ done
   - [x] Dropdown provider di Watch bila >1 provider ter-resolve
10. **Kelola provider global di admin** (issue #19, #21) — ✅ done
   - [x] `/admin/settings`: tambah provider (label, media type, URL movie/TV, aktif)
   - [x] Edit inline per row, reorder panah, toggle aktif — perubahan menunggu "Simpan Pengaturan"
   - [x] Validasi bersama: `{tmdb_id}` wajib, TV wajib bila `media_type` bukan `movie`
11. **Fallback otomatis** (issue #10) — ✅ done
   - [x] Pool global menutup judul tanpa override self

### P1 — Should Have
1. **Watchlist/simpan favorit** — ✅ done (browser-local, `src/lib/watchlist.js`)
2. **Rekomendasi personalisasi** — ⬜ belum
3. **Filter lanjutan** — ⬜ belum

### P2 — Could Have
1. **Continue watching** — ✅ done (issue #2; `src/lib/history.js`, resume posisi; TV resume
   episode terakhir diperbaiki di commit `d867d61`)
2. **Pilihan subtitle/bahasa** — ⬜ belum

### Non-Fungsional
- **Performa:** lazy-load poster; **[AMEND]** cache respons TMDB di backend (in-memory TTL 2
  kelas, issue #17); CDN untuk asset statis.
- **Keamanan:** auth admin terpisah (session cookie, `server/admin.js`); rate-limit upload —
  **[AMEND]** tidak relevan karena upload tidak diimplementasi (non-goal).
- **Skalabilitas:** single server; beban video didelegasikan ke sumber eksternal.

## Data & Integrasi
- **TMDB API:** trending, discover (movie/tv), search/multi, detail, episode list, watch-providers.
- **Sumber video:** **[AMEND]** URL stream HLS eksternal untuk konten self; embed URL pihak
  ketiga lewat pool provider global (vendor: template URL, contoh viduki.net, Videasy).
- **Player:** ArtPlayer + hls.js (file self); iframe generik (embed).
- **Auth admin:** session cookie via backend Express (`server/admin.js`).

## Success Metrics
- **Leading:** jumlah pengunjung/browsing aktif harian.
- **Lagging:** retention — viewer kembali dalam 7/30 hari.

## Open Questions
- Nama produk/brand belum ditentukan. ✅ terselesaikan sebagian: **Seluloid**.
- ~~Vendor layanan streaming HLS/DASH belum dipilih.~~ ✅ **[AMEND]** diputuskan: tidak pakai
  layanan upload HLS/DASH; konten self ditautkan via URL; sumber tambahan via pool embed global.
- Perlu sistem akun viewer untuk watchlist lintas device, atau cukup browser-local? — tetap terbuka.
- Detail auth admin (single vs multi-admin)? — tetap terbuka (saat ini single admin via env).
- Target angka spesifik metric pengunjung/retention — tetap terbuka.

## Timeline
Tanpa target tanggal kaku. P0 MVP sudah terlampaui; fitur provider & admin settings di luar PRD
asli sudah diimplementasi (lihat tabel status di atas).

## Catatan Perubahan (amend)
- **2026-08-17:** Amend PRD agar sinkron dengan implementasi.
  - Menambah dimensi provider: registri (`resolveProviders`), pool provider global, selector di
    player, kelola di `/admin/settings` (edit inline + reorder).
  - Menambah cache TMDB backend (non-fungsional).
  - Menandai gap PRD asli: upload file HLS/DASH → diputuskan non-goal (konten self ditautkan
    via URL, bukan upload).
  - Menandai fitur PRD yang sudah done: P0 #1–#3, #5, #6; P1 watchlist; P2 continue watching.
  - Fitur di luar PRD asli (sudah dibuat): issue #8, #10, #13, #17, #19, #21.

---

```yaml
agent_summary:
  problem: "Belum ada platform terpusat untuk menonton koleksi film/series milik/lisensi sendiri dengan pengalaman browsing setara Netflix, dilengkapi metadata dari TMDB."
  must_have:
    - "Browse/discover & search film/series pakai data TMDB (done)"
    - "Halaman detail dengan metadata TMDB, episode klikable ke player (done)"
    - "Admin panel: tambah/edit/hapus entri, auto-match TMDB + review manual (done)"
    - "Play video: ArtPlayer HLS untuk URL self + iframe untuk embed (done; upload file = non-goal)"
    - "Link 'Tonton di platform legal' via TMDB watch-providers (done)"
    - "Status draft/publish per entri, disaring di public API (done)"
    - "Registri provider: resolveProviders override -> legacy -> pool global (done)"
    - "Pool provider global (embed URL template) + selector di player + kelola di /admin/settings (done)"
  nice_to_have:
    - "Watchlist/simpan favorit (done, browser-local)"
    - "Rekomendasi personalisasi (belum)"
    - "Filter lanjutan (genre, tahun, rating) (belum)"
    - "Continue watching + resume posisi (done)"
    - "Pilihan subtitle/bahasa (belum)"
  data_entities:
    - "TMDB metadata (movie, tv, season, episode, watch-providers)"
    - "Entri katalog internal (judul, tmdb_id, status, providers self per-entri)"
    - "Config global (providers pool embed: id,label,movie_url,tv_url,media_type,enabled)"
    - "Admin user (kredensial login via env)"
  success_metric: "Jumlah pengunjung/browsing aktif harian dan retention (viewer balik 7/30 hari)"
  open_questions:
    - "Sistem akun viewer untuk watchlist lintas device"
    - "Detail auth admin (single vs multi-admin)"
    - "Target angka spesifik retention/pengunjung"
  constraint_notes: "Streaming dibatasi konten milik/lisensi admin via URL stream HLS atau embed; konten pihak ketiga yang tidak dimiliki hanya katalog info + link legal. Provider embed pihak ketiga adalah sumber eksternal yang dikelola admin; legalitas ditanggung admin."
```
