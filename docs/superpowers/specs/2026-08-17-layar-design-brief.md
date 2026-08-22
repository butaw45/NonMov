# LAYAR — Design Brief (Arsip Layar)

> **Status: DESIGN/REVIEW ONLY — BELUM DIIMPLEMENTASI.**
> Rebranding + restruktur UI/UX + clean code. Nama produk baru: **LAYAR** (dari "layar" = screen).
> Arah: **"Arsip Layar"** — katalog film/series sebagai arsip yang hidup, bukan etalase streaming.
> Bukan "ruang proyeksi" (tema lama). Bukan AI-default (bukan cream/serif/terracotta, bukan hitam-asam-hijau, bukan broadsheet).

## 1) Identitas

- **Nama**: **LAYAR** — singkat, Indonesia, langsung mengait ke "menonton".
- **Tagline**: "Arsip film & series pribadi Anda." (bukan "Netflix clone").
- **Voice**: tenang, terkurasi, seperti katalog museum — tidak menjual, tidak hype.

## 2) Palet (5 hex, bukan default)

| Token | Hex | Peran |
|-------|-----|-------|
| `--bg` | `#101216` | biru-tinta gelap (bukan hitam hangat) |
| `--panel` | `#181b21` | abu-biru (kartu, panel, input) |
| `--ink` | `#e8e6df` | putih tulang (teks utama) |
| `--accent` | `#d4a017` | kuning arsip / emas tua (CTA, aksen utama) |
| `--accent-2` | `#5b7f6e` | hijau abu (label, status, badge) |

> Tidak ada merah Netflix (`#e50914`), tidak ada amber proyektor (`#e9b458`).

## 3) Tipografi (3 wajah)

| Peran | Typeface | Fallback | Pemakaian |
|-------|----------|----------|-----------|
| Display | **DM Serif Display** | Georgia, serif | judul hero, heading section, nomor katalog |
| Body/UI | **Inter** | system-ui | teks, tombol, metadata, navigasi |
| Data/Mono | **IBM Plex Mono** | monospace | nomor katalog, durasi, rating, kode |

**Type scale (6 langkah):** `12, 14, 16, 20, 28, 40` (px) — konsisten di semua halaman.


**Type scale (6 langkah):** `12, 14, 16, 20, 28, 40` (px) — konsisten di semua halaman.

## 4) Layout & struktur

- **Top bar** (bukan navbar mengambang): logo LAYAR + nav + cari + menu — selalu solid.
- **Eyebrow/kicker baru**: `NO. 00124 · ARSIP MINGGU INI` — nomor katalog + label rubrik.
- **Strip arsip** (bukan panah bulat): navigasi row dengan nomor urut `[01] [02] [03] …`.
- **Grid**: 12 kolom, gutter 24px, container max 1280px.
- **Spacing scale**: `4, 8, 12, 16, 24, 32, 48` (px).

## 5) Signature element (satu, diingat)

**"Nomor Katalog + Strip Arsip"** — setiap judul punya nomor urut (`NO. 00124`) yang muncul di hero, kartu, dan detail; strip horizontal dengan nomor urut (bukan panah) untuk navigasi row. Ini membuat LAYAR terasa seperti *katalog yang dikurasi*, bukan *feed tak berujung*.
## 6) Prinsip clean code (ponytail — simplified)

- **Satu sumber kebenaran**: `tokens.css` (warna, type, spacing) — tidak ada nilai hardcode di komponen.
- **Rename di tempat**: `Navbar.jsx` → `TopBar.jsx`, `Hero.jsx` → `HeroCard.jsx`. Tetap di `components/`, import relatif `./` tidak berubah.
- **CSS merge, bukan split**: 7 file → 4 file (`tokens.css`, `base.css`, `components.css`, `layout.css` + `pages.css` halaman unik).
- **Skip deep module palsu**: `tmdb.js` sudah cukup — tidak butuh `lib/catalog.js` wrapper. `utils.js` sudah punya `titleOf`, `yearOf`, `ratingOf` — tinggal tambah `catalogNo()`.
- **Nama kelas konsisten**: `.btn`, `.card`, `.kicker`, `.row` — tanpa override berantai.

## 7) Non-goals (fase ini)

- Bukan mengubah alur data TMDB / admin API.
- Bukan menambah fitur baru (rekomendasi #23, filter #24 tetap terpisah).
- Bukan mengubah backend / server.
- Bukan implementasi — hanya desain + rencana.
