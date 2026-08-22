# LAYAR — Restructure Plan (ponytail — simplified)

> **Status: DESIGN/REVIEW ONLY — BELUM DIIMPLEMENTASI.**
> Rencana restruktur + clean code. Revisi dari versi sebelumnya: rename di tempat (bukan subfolder), CSS merge (bukan split), skip deep module palsu.

## 1) Perubahan file (rename di tempat)

| File lama | File baru | Perubahan |
|-----------|-----------|-----------|
| `src/components/Navbar.jsx` | `src/components/TopBar.jsx` | solid, bukan mengambang; props `active` eksplisit |
| `src/components/Hero.jsx` | `src/components/HeroCard.jsx` | terima `item`, `onWatch`, `onToggle` (tanpa `Link`/`useWatchlist`) |
| `src/components/ContinueRow.jsx` | tetap | pakai `PosterCard` presentational |
| `src/components/Row.jsx` | tetap | strip arsip (nomor urut), bukan panah bulat |
| `src/components/PosterCard.jsx` | tetap | terima `item`, `saved`, `onToggle` sebagai props |
| `src/components/BottomNav.jsx` | tetap | pakai token baru |
| `src/components/Footer.jsx` | tetap | branding "LAYAR" |
| `src/components/Icons.jsx` | tetap | tambah ikon jika perlu |
| `src/components/Logo.jsx` | tetap | ganti wordmark jadi "LAYAR", ganti logo SVG |
| `src/components/Skeletons.jsx` | tetap | pakai token baru |
| `src/components/ErrorBoundary.jsx` | tetap | tidak berubah |
| `src/components/AdminLayout.jsx` | `src/pages/AdminLayout.jsx` | pindah ke pages (dia container, bukan komponen) |
| `src/pages/Admin*.jsx` | `src/pages/Admin/*.jsx` | pindah ke subfolder Admin |

**Import path yang berubah:**
- `App.jsx`: `./components/Navbar` → `./components/TopBar`, `./components/Hero` → `./components/HeroCard`
- `AdminLayout.jsx` consumer: `../components/AdminLayout` → `./AdminLayout`
- Semua import relatif `./` antar komponen TIDAK berubah.

## 2) CSS merge (7 → 4 file)

| Sebelum | Sesudah | Isi |
|---------|---------|-----|
| `tokens.css` | `tokens.css` | HANYA variabel CSS + reset minimal. Type scale, spacing, warna — tidak ada class selector. |
| (baru) | `base.css` | Reset body, html, focus, scrollbar, selection — dipisah dari tokens agar tokens murni variabel. |
| `components.css` | `components.css` | Merge `components-ui.css` ke sini. Semua .btn, .card, .kicker, .chip — satu definisi. |
| `layout.css` | `layout.css` | .topbar, .grid, .strip, .container, .bottomnav, .footer |
| `pages.css` | `pages.css` | Tetap, halaman yang benar-benar unik |
| `pages-misc.css` | merge ke `pages.css` | Satu file untuk semua page style |
| `pages-detail.css` | merge ke `pages.css` | Satu file untuk semua page style |
| `components-ui.css` | merge ke `components.css` | Tidak perlu file terpisah |

## 3) Clean code (yang di-skip)

| Rencana lama | Keputusan | Alasan |
|---|---|---|
| `lib/catalog.js` deep module | **Skip** — `tmdb.js` sudah cukup | 1 wrapper dengan 1 implementasi bukan deep module. Pages panggil `tmdb.js` langsung. |
| `lib/format.js` file baru | **Skip** — `utils.js` sudah punya 6/7 fungsi | Tinggal tambah `catalogNo()` ke `utils.js`. 1 file, bukan 2. |
| `components/ui/`, `layout/`, `media/` subfolder | **Skip** — rename di tempat | 12 rename + semua import path berubah vs 6 rename tanpa import break. |

## 4) Interface final (presentational vs container)

### PosterCard (presentational murni)
```jsx
// props masuk, render keluar — tidak tahu watchlist, tidak tahu routing
export default function PosterCard({ item, saved, onToggle }) {
  return (
    <Link className="card" to={`/judul/${mediaTypeOf(item)}/${item.id}`}>
      {/* poster + caption */}
      <button className="card-save" onClick={(e) => { e.preventDefault(); onToggle(item) }}>
        {saved ? '✓ Tersimpan' : '+ Simpan'}
      </button>
    </Link>
  )
}
```

### HeroCard (presentational murni)
```jsx
export default function HeroCard({ item, onWatch, onToggle, saved }) {
  return (
    <section className="hero">
      <div className="hero-bg"><img src={backdrop} alt="" /></div>
      <div className="hero-content">
        <p className="kicker">{catalogNo(item.id)} · ARSIP MINGGU INI</p>
        <h1 className="hero-title">{titleOf(item)}</h1>
        <p className="hero-meta">{ratingOf(item)} · {yearOf(item)} · {runtimeLabel(runtime)}</p>
        <button className="btn btn-primary" onClick={onWatch}>Tonton</button>
        <button className="btn btn-ghost" onClick={() => onToggle(item)}>
          {saved ? 'Tersimpan' : 'Simpan'}
        </button>
      </div>
    </section>
  )
}
```

### TopBar (solid, bukan Navbar mengambang)
```jsx
// Tidak ada useState scrolled, tidak ada useEffect scroll — selalu solid
export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="topbar-brand"><Logo /></Link>
        <nav className="topbar-links">...</nav>
        <form className="topbar-search">...</form>
        <Link to="/watchlist" className="topbar-action">Daftar Saya</Link>
      </div>
    </header>
  )
}
```

## 5) Langkah migrasi (3 PR bertahap)

| PR | Lingkup | File |
|----|---------|------|
| **PR 1: Tokens + Brand** | `tokens.css` baru, `base.css` baru, Google Fonts, `Logo.jsx`, `index.html`, `Footer.jsx` | 5 file |
| **PR 2: Komponen** | `Navbar→TopBar`, `Hero→HeroCard`, `Row` strip arsip, `PosterCard` props, `Kicker` | ~6 file |
| **PR 3: CSS Merge + Clean** | Merge CSS, rename classes, pages ikut tokens, `AdminLayout→pages/`, `utils.js +catalogNo` | ~8 file |

## 6) Non-goals

- Bukan mengubah alur data TMDB / admin API.
- Bukan menambah fitur baru (#23, #24 sudah selesai).
- Bukan mengubah backend / server.