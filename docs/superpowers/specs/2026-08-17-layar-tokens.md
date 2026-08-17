# LAYAR — Token System (tokens.css lengkap)

> **Status: DESIGN/REVIEW ONLY — BELUM DIIMPLEMENTASI.**
> Satu sumber kebenaran untuk semua nilai desain. Tidak ada nilai hardcode di komponen.
> Nama file target: `src/styles/tokens.css` (menggantikan tokens lama "ruang proyeksi").

```css
/* ============================================================
   LAYAR — design tokens (satu sumber kebenaran)
   Arah: "Arsip Layar" — biru-tinta + kuning arsip + hijau abu
   ============================================================ */

:root {
  /* ---------- Warna ---------- */
  --bg: #101216;            /* biru-tinta gelap */
  --bg-deep: #0b0d10;       /* lebih gelap (footer, overlay) */
  --panel: #181b21;         /* abu-biru (kartu, input, panel) */
  --panel-2: #1f232b;       /* abu-biru lebih terang (hover, aktif) */

  --ink: #e8e6df;           /* putih tulang (teks utama) */
  --ink-dim: #c9c6bd;       /* teks sekunder */
  --muted: #8b8f98;         /* teks tersier / placeholder */
  --faint: #5c616b;         /* teks sangat lemah / disabled */

  --line: rgba(232, 230, 223, 0.08);        /* garis tipis */
  --line-strong: rgba(232, 230, 223, 0.16); /* garis tegas */

  --accent: #d4a017;        /* kuning arsip / emas tua (CTA, aksen) */
  --accent-hi: #e8b93a;     /* aksen hover */
  --accent-ink: #161003;    /* teks di atas aksen */

  --accent-2: #5b7f6e;      /* hijau abu (label, status, badge) */
  --accent-2-hi: #6f9784;   /* hijau abu hover */

  --danger: #b0473c;        /* merah bata (error, hapus) — bukan merah Netflix */

  /* ---------- Tipografi ---------- */
  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-ui: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SF Mono", monospace;

  /* Type scale (6 langkah) */
  --text-xs: 0.75rem;    /* 12px — caption, label kecil */
  --text-sm: 0.875rem;   /* 14px — body kecil, meta */
  --text-md: 1rem;       /* 16px — body utama */
  --text-lg: 1.25rem;    /* 20px — sub-judul */
  --text-xl: 1.75rem;    /* 28px — judul section */
  --text-2xl: 2.5rem;    /* 40px — judul hero */

  --leading-tight: 1.2;
  --leading-body: 1.55;

  /* ---------- Spacing scale (7 langkah) ---------- */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-12: 48px;

  /* ---------- Radius ---------- */
  --radius: 4px;        /* lebih tajam dari tema lama (6px) */
  --radius-lg: 8px;

  /* ---------- Elevasi ---------- */
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-2: 0 8px 24px rgba(0, 0, 0, 0.45);

  /* ---------- Layout ---------- */
  --nav-h: 60px;
  --container: 1280px;
  --gutter: 24px;

  /* ---------- Motion ---------- */
  --ease: cubic-bezier(0.22, 0.61, 0.36, 1);
  --dur: 180ms;
  --dur-slow: 320ms;
}
```

## Catatan pemakaian

- **Tidak ada nilai hardcode** di komponen: semua warna, ukuran, radius, shadow pakai token.
- **Type scale** konsisten: judul hero `var(--text-2xl)`, section `var(--text-xl)`, body `var(--text-md)`, meta `var(--text-sm)`, caption `var(--text-xs)`.
- **Spacing** konsisten: margin/padding pakai `var(--sp-*)`, bukan angka acak.
- **Mono** untuk data: nomor katalog, durasi, rating, tahun, kode — pakai `var(--font-mono)`.
- **Aksen**: `--accent` untuk CTA utama; `--accent-2` untuk label/status; `--danger` untuk error/hapus.
