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

7. **Selalu cek skill sebelum tindakan** — sebelum melakukan planning, design,
   implementation, review, atau tindakan apapun:
   a. Cek apakah ada skill yang relevan (melalui `find-skills` atau daftar skill
      yang tersedia).
   b. Jika ada skill relevan, WAJIB baca dan gunakan skill tersebut sebelum
      melanjutkan. Jangan langsung implement tanpa skill.
   c. Skill yang relevan untuk plan/design: `brainstorming`, `domain-modeling`,
      `codebase-design`, `writing-plans`. Untuk implementasi: `subagent-driven-development`,
      `executing-plans`, `tdd`, `verification-before-completion`.
   d. Jika tidak yakin skill mana yang relevan, gunakan `ask-matt` sebagai router
      untuk menentukan skill/flow yang tepat sebelum melanjutkan.
   e. Catat di plan/issue jika skill tertentu digunakan.

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
- Remote repo: https://github.com/butaw45/NonMov.git (branch utama: `main`)
- Identitas git diset **lokal** di repo ini: Muhammad Haris <hariis12k@gmail.com>
