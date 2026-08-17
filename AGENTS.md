# AGENTS.md — Seluloid (NonMov)

## Tentang Proyek

Seluloid — katalog & streaming film/series bergaya Netflix berbasis TMDB API.
Frontend-only (React 18 + Vite 6), UI berbahasa Indonesia.
Dokumen PRD lengkap: `docs/prd-tmdb-netflix-clone.md`.

## Tech Stack

- React 19 + Vite 8 (`@vitejs/plugin-react`), react-router-dom v7
- ArtPlayer + hls.js (video player HLS)
- TMDB API — API key lewat `.env` (`VITE_TMDB_API_KEY`)
- CSS murni di `src/styles/` (tanpa framework CSS)

## Perintah

- `npm run dev` — dev server (port 5173)
- `npm run build` — build produksi ke `dist/`
- `npm run preview` — preview hasil build

## Struktur

- `src/main.jsx`, `src/App.jsx` — entry point & routing
- `src/pages/` — 11 halaman (Home, Browse, Search, Detail, Watch, Watchlist, Setup, NotFound, Admin, AdminEntry, AdminLogin)
- `src/components/` — komponen UI (Navbar, Hero, Row, PosterCard, AdminLayout, dll)
- `src/lib/` — klien TMDB (`tmdb.js`), klien Admin API (`api.js`), watchlist lokal (`watchlist.js`), history (`history.js`), hooks, utils
- `src/styles/` — CSS (tokens, layout, components, pages)
- `server/` — backend minimal Express: proxy TMDB, `/api/catalog`, Admin API `/admin/api/*`, static serve `dist/` (produksi)
  - `server/index.js` — entry server (port 4001)
  - `server/admin.js` — business logic admin (auth sesi, CRUD entri, auto-match TMDB)
  - `server/adminRoutes.js` — Express router `/admin/api/*` (proteksi cookie `admin_session`)
  - `server/catalog.json` — katalog konten custom `{ entries, sessions }` (di-commit; kelola via `/admin`)
  - `server/.env` — API key TMDB + `ADMIN_USER`/`ADMIN_PASS` (gitignore; contoh di `server/.env.example`)

## Perintah Backend

- `cd server && npm install` — install dependensi backend (Express)
- `cd server && npm run dev` — backend dev (load `server/.env` via `--env-file`, watch restart)
- `cd server && npm start` — produksi: static `dist/` + proxy TMDB (butuh `npm run build` dulu di root)

## Aturan Workflow (WAJIB diikuti agen)

1. **GitHub selalu via GH CLI** — untuk semua operasi GitHub (PR, issue, release,
   repo, CI/CD) gunakan `gh` CLI (sudah terautentikasi sebagai `butaw45`).
   Perintah dasar (add/commit/push/pull) tetap pakai `git` biasa.

2. **Selalu re-index knowledge graph setelah ada perubahan file** — setiap kali
   selesai mengubah/menambah/menghapus file sumber, WAJIB:
   a. Cek apakah ada perubahan file (via `git status` atau `detect_changes`).
   b. Jika ada perubahan pada file sumber, SELALU re-index:
      `index_repository(repo_path="<root proyek ini>", mode="moderate")`
   c. Nama project di graph: `C-Users-Haris-Documents-Local-Projek-NonMov`.

3. **Jangan pernah commit `.env`** — berisi API key TMDB. Sudah ter-gitignore;
   pastikan tetap tidak ter-stage saat `git add`.

4. **Git mutation butuh konfirmasi** — sebelum `git commit`/`push`/operasi git
   lain yang mengubah riwayat, selalu minta konfirmasi user dulu.

5. **Cek update teknologi selalu via Context7** — setiap kali user menanyakan
   status versi, update, atau fitur terbaru framework/dependensi, WAJIB gunakan
   Context7 (`resolve-library-id` → `query-docs`) untuk data terbaru, lalu
   konfirmasi silang dengan `npm outdated`. Jangan mengandalkan ingatan model.

6. **Tanya dulu saat ada pilihan** — setiap kali ada keputusan yang ambigu atau
   lebih dari satu opsi yang masuk akal (UX, bahasa, arsitektur, dsb.), WAJIB
   tanyakan ke user dulu sebelum memutuskan. Jangan memilih sepihak.

7. **Skill selection (baca hanya yang load-bearing)** — skill bukan checklist seragam;
   tiap doc punya biaya konteks + latency. Sebelum planning/design/implementation/review:
   a. **Pilah**: tentukan skill mana yang *menentukan hasil* task ini — baca HANYA itu,
      sisanya boleh skip. Bukan "baca semua yang relevan".
   b. **Tabel minimum wajib** (non-negotiable untuk kategori ini):
      - Fitur/behavior baru → `brainstorming` (pahami intent dulu)
      - Perubahan arsitektur/interface antar-modul → `codebase-design`
      - Ada term/ambiguity domain → `domain-modeling`
      - Rancangan/plan multi-langkah → `writing-plans`
      - Implementasi fitur/bugfix → `tdd` (test-first), atau minimal
        `test-driven-development`
      - Sebelum merge/PR → `requesting-code-review` + reviewer subagent
      - Setiap klaim "done" → pintu verifikasi (rule 7c)
   c. **Pintu verifikasi WAJIB sebelum "done"** (ini yang paling penting — lebih
      menentukan kualitas daripada doc mana yang dibaca): klaim selesai hanya
      boleh keluar setelah bukti nyata — build lulus, test/smoke jalan, atau
      reviewer subagent approve. Tanpa bukti = belum selesai.
   d. **Rancangan/spec sudah ada dari sesi lalu** → cukup *refresh* singkat (tidak
      perlu baca ulang penuh), pastikan keputusan design masih relevan.
   e. Kalau tidak yakin skill mana yang tepat → pakai `find-skills` untuk menemukan;
      jangan menebak.
   f. Catat di issue/plan jika skill tertentu digunakan.

## Catatan

- **Dua sistem graf — pembagian tugas:**
  - **codebase-memory-mcp** = graf kode LIVE (sumber kebenaran struktur kode:
    fungsi, call graph, arsitektur). WAJIB di-re-index tiap ada perubahan file
    sumber (lihat aturan #2).
  - **Graphify CLI** (`graphify-out/`) = graf konsep/dokumen + viz HTML statis,
    snapshot per run via skill `/graphify` (terpasang global di
    `~/.agents/skills/graphify/`). Sudah di-gitignore; bukan sumber kebenaran
    struktur kode.
- **Kapan pakai yang mana:** gunakan `graphify` untuk eksplorasi visualisasi
  codebase secara holistik (graph interaktif, community detection, god nodes).
  Gunakan `codebase-memory` untuk query kode spesifik (fungsi, caller, definisi).
  Keduanya melengkapi: graphify untuk "peta", codebase-memory untuk "detail".
- **Kapan graphify digunakan:**
  - Eksplorasi awal codebase (onboarding, audit arsitektur)
  - Review PR/branch yang berdampak luas (multiple file, multi-module)
  - Mencari cross-cutting concerns atau dead code yang tidak terlihat dari satu file
  - Presentasi visual arsitektur ke stakeholder
  - Pertanyaan "apa hubungan antar modul?" yang butuh community detection
- **Kapan graphify TIDAK digunakan:**
  - Bug fix sederhana (satu file, satu fungsi)
  - Menambahkan fitur kecil yang sudah punya lokasi jelas
  - Query spesifik ("siapa yang memanggil X?") — pakai codebase-memory saja
  - Setiap commit/perubahan kecil — terlalu berat untuk incremental changes
- **Kapan graphify di-rebuild:**
  - Setelah merge PR besar yang mengubah struktur codebase secara signifikan
  - Setiap kali selesai milestone fitur yang mengubah >20% file
  - Sebelum eksplorasi arsitektur untuk memastikan graph fresh
  - Setelah pergantian branch besar (misal: merge dev ke main)
- **Kapan graphify TIDAK di-rebuild:**
  - Setiap perubahan file kecil — codebase-memory cukup
  - Saat debugging satu bug — gunakan graph yang ada atau codebase-memory
  - Saat implementasi fitur berantai (tunggu sampai milestone selesai)
  - Jika graphify-out/graph.json ada dan masih relevan — fast path query saja
- Remote repo: https://github.com/butaw45/NonMov.git (branch utama: `main`)
- Identitas git diset **lokal** di repo ini: Muhammad Haris <hariis12k@gmail.com>
