# AGENTS.md — Seluloid (NonMov)

## Tentang Proyek

Seluloid — katalog & streaming film/series bergaya Netflix berbasis TMDB API.
Frontend-only (React 18 + Vite 6), UI berbahasa Indonesia.
Dokumen PRD lengkap: `docs/prd-tmdb-netflix-clone.md`.

## Tech Stack

- React 18 + Vite 6 (`@vitejs/plugin-react`), react-router-dom v6
- ArtPlayer + hls.js (video player HLS)
- TMDB API — API key lewat `.env` (`VITE_TMDB_API_KEY`)
- CSS murni di `src/styles/` (tanpa framework CSS)

## Perintah

- `npm run dev` — dev server (port 5173)
- `npm run build` — build produksi ke `dist/`
- `npm run preview` — preview hasil build

## Struktur

- `src/main.jsx`, `src/App.jsx` — entry point & routing
- `src/pages/` — 8 halaman (Home, Browse, Search, Detail, Watch, Watchlist, Setup, NotFound)
- `src/components/` — komponen UI (Navbar, Hero, Row, PosterCard, dll)
- `src/lib/` — klien TMDB (`tmdb.js`), watchlist lokal (`watchlist.js`), hooks, utils
- `src/styles/` — CSS (tokens, layout, components, pages)

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

## Catatan

- **Dua sistem graf — pembagian tugas:**
  - **codebase-memory-mcp** = graf kode LIVE (sumber kebenaran struktur kode:
    fungsi, call graph, arsitektur). WAJIB di-re-index tiap ada perubahan file
    sumber (lihat aturan #2).
  - **Graphify CLI** (`graphify-out/`) = graf konsep/dokumen + viz HTML statis,
    snapshot per run via skill `/graphify` (terpasang global di
    `~/.agents/skills/graphify/`). Sudah di-gitignore; bukan sumber kebenaran
    struktur kode.
- Remote repo: https://github.com/butaw45/NonMov.git (branch utama: `main`)
- Identitas git diset **lokal** di repo ini: Muhammad Haris <hariis12k@gmail.com>
