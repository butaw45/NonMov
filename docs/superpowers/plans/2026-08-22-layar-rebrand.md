# LAYAR — Rebrand + Restruktur + Clean Code — Implementation Plan

> **Untuk agentic workers:** REQUIRED SUB-SKILL: Gunakan `subagent-driven-development` (direkomendasikan) atau `executing-plans` untuk implementasi task-by-task. Langkah pakai checkbox (`- [ ]`) untuk tracking.

**Goal:** Rebrand Seluloid → LAYAR "Arsip Layar": palet biru-tinta + kuning arsip, DM Serif Display + Inter + IBM Plex Mono, komponen presentational, CSS merge 7→4 file.

**Arsitektur:** 3 PR bertahap — (1) tokens + brand identity, (2) komponen utama (TopBar, HeroCard, Row, PosterCard props, Kicker), (3) CSS merge + clean code + Admin pindah folder.

**Tech Stack:** React 19, Vite 8, CSS murni (variabel CSS), Google Fonts

## Global Constraints

- `--font-display: "DM Serif Display"` (bukan Space Grotesk / Fraunces)
- Palet: `--bg: #101216`, `--panel: #181b21`, `--ink: #e8e6df`, `--accent: #d4a017`, `--accent-2: #5b7f6e`
- Rename di tempat — tidak buat subfolder `ui/` `layout/` `media/`
- Tidak buat `lib/catalog.js` atau `lib/format.js` — `tmdb.js` + `utils.js` sudah cukup
- `npm run build` harus lulus di akhir setiap PR
- Komponen presentational: props masuk, render keluar — tidak ada hook watchlist/routing di dalam
- Setiap perubahan file → re-index codebase-memory

---

# PR 1: Tokens + Brand Identity

### Task 1.1: Google Fonts + index.html

**Files:**
- Modify: `index.html:12-18`
- Modify: `index.html:19`
- Modify: `index.html:6`
- Modify: `index.html:8-9`

**Interfaces:**
- Consumes: tidak ada
- Produces: `<link>` Google Fonts DM Serif Display + Inter + IBM Plex Mono; `<title>` LAYAR; `<meta>` theme-color + description

- [ ] **Step 1: Ganti font link**

```html
<link
  href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;1,14..32,400;1,14..32,600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 2: Ganti `<title>` + meta tags**

```html
<title>LAYAR — Arsip Film &amp; Series</title>
<meta name="theme-color" content="#101216" />
<meta
  name="description"
  content="LAYAR — arsip film & series pribadi. Katalog terkurasi dengan metadata TMDB lengkap."
/>
```

- [ ] **Step 3: Verifikasi** — `npm run dev`, buka browser, DevTools → Network → Fonts: 3 font ter-load (DM Serif Display, Inter, IBM Plex Mono)

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(layar): Google Fonts DM Serif Display + Inter + IBM Plex Mono, title/meta LAYAR"
```

---

### Task 1.2: tokens.css — palet + type + spacing baru

**Files:**
- Modify: `src/styles/tokens.css`

**Interfaces:**
- Consumes: tidak ada
- Produces: CSS custom properties `--bg`, `--panel`, `--ink`, `--accent`, `--accent-2`, `--font-display`, `--font-ui`, `--font-mono`, type scale, spacing scale

- [ ] **Step 1: Ganti seluruh isi `:root` block (baris 6–30)**

```css
:root {
  /* ---------- Warna ---------- */
  --bg: #101216;
  --bg-deep: #0b0d10;
  --panel: #181b21;
  --panel-2: #1f232b;
  --ink: #e8e6df;
  --ink-dim: #c9c6bd;
  --muted: #8b8f98;
  --faint: #5c616b;
  --line: rgba(232, 230, 223, 0.08);
  --line-strong: rgba(232, 230, 223, 0.16);
  --accent: #d4a017;
  --accent-hi: #e8b93a;
  --accent-ink: #161003;
  --accent-2: #5b7f6e;
  --accent-2-hi: #6f9784;
  --danger: #b0473c;

  /* ---------- Tipografi ---------- */
  --font-display: "DM Serif Display", Georgia, serif;
  --font-ui: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SF Mono", monospace;

  /* Type scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.75rem;
  --text-2xl: 2.5rem;
  --leading-tight: 1.2;
  --leading-body: 1.55;

  /* ---------- Spacing ---------- */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-12: 48px;

  /* ---------- Radius ---------- */
  --radius: 4px;
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

- [ ] **Step 2: Ganti warna hardcoded di luar `:root` (scrollbar, selection, focus)**

Scrollbar thumb: `#2c2620` → `var(--line-strong)`, hover `#4a3f30` → `var(--muted)`.

Selection: `var(--amber)` → `var(--accent)`, `var(--amber-ink)` → `var(--accent-ink)`.

- [ ] **Step 3: Hapus section body::after (grain texture)** — tidak sesuai arah "Arsip Layar"

- [ ] **Step 4: Verifikasi** — halaman terbuka, warna berubah ke biru-tinta gelap, tidak ada grain overlay

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat(layar): tokens.css — palet biru-tinta + kuning arsip + DM Serif Display + spacing scale"
```

---

### Task 1.3: base.css — pisahkan reset dari tokens

**Files:**
- Create: `src/styles/base.css`
- Modify: `src/styles/tokens.css` (pindahkan reset ke base.css)
- Modify: `src/main.jsx` (tambah import base.css)

**Interfaces:**
- Consumes: `tokens.css` sudah di-import sebelumnya
- Produces: `base.css` — reset, body, scrollbar, focus, selection

- [ ] **Step 1: Buat `src/styles/base.css`**

```css
/* ============================================================
   LAYAR — base: reset, body, scrollbar, focus, selection
   ============================================================ */

* { margin: 0; padding: 0; box-sizing: border-box; }

[hidden] { display: none !important; }

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-ui);
  font-size: var(--text-md);
  line-height: var(--leading-body);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

img { display: block; max-width: 100%; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
input, select { font-family: inherit; font-size: inherit; color: inherit; }

::selection { background: var(--accent); color: var(--accent-ink); }

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 2px;
}

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--bg-deep); }
::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 6px; border: 2px solid var(--bg-deep); }
::-webkit-scrollbar-thumb:hover { background: var(--muted); }
```

- [ ] **Step 2: Kurangi `tokens.css`** — hapus baris yang sudah dipindah ke `base.css` (semua dari `* { margin: 0` sampai `.container`), sisakan hanya `:root { … }` + `.container` + `.page-pad` + `.page-head` + `.kicker` + `.btn` + `.field`

- [ ] **Step 3: Tambah import di `src/main.jsx`** — setelah `import './styles/tokens.css'`, tambah `import './styles/base.css'`

- [ ] **Step 4: Verifikasi** — `npm run build` lulus, halaman render normal

- [ ] **Step 5: Commit**

```bash
git add src/styles/base.css src/styles/tokens.css src/main.jsx
git commit -m "feat(layar): base.css — pisahkan reset/body/scrollbar dari tokens.css"
```

---

### Task 1.4: Logo.jsx — wordmark "LAYAR"

**Files:**
- Modify: `src/components/Logo.jsx`

**Interfaces:**
- Consumes: `--accent`, `--ink`, `--font-display` dari tokens.css
- Produces: `<Logo />` dengan SVG baru + wordmark "LAYAR"

- [ ] **Step 1: Ganti Logo.jsx**

```jsx
// Logo LAYAR: ikon abstrak + wordmark.
// Ikon: persegi dengan garis horizontal (layar bioskop) — sederhana, bukan bingkai film.

export default function Logo({ withWord = true, height = 30 }) {
  return (
    <span className="logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg viewBox="0 0 48 48" style={{ height, width: 'auto' }} aria-hidden="true">
        <rect
          x="4" y="8" width="40" height="28" rx="4"
          fill="none" stroke="var(--accent)" strokeWidth="2.5"
        />
        <line
          x1="4" y1="26" x2="44" y2="26"
          stroke="var(--accent)" strokeWidth="1" opacity="0.4"
        />
        <circle cx="16" cy="17" r="1.8" fill="var(--accent-2)" />
        <circle cx="32" cy="17" r="1.8" fill="var(--accent-2)" />
      </svg>
      {withWord && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: height * 0.7,
            letterSpacing: '0.06em',
            lineHeight: 1,
            color: 'var(--ink)',
          }}
        >
          LAYAR
        </span>
      )}
    </span>
  )
}
```

- [ ] **Step 2: Verifikasi** — logo "LAYAR" muncul di top-left halaman, ikon baru (persegi + garis horizontal)

- [ ] **Step 3: Commit**

```bash
git add src/components/Logo.jsx
git commit -m "feat(layar): Logo — wordmark LAYAR + ikon layar bioskop"
```

---

### Task 1.5: Footer.jsx — teks brand LAYAR

**Files:**
- Modify: `src/components/Footer.jsx`

- [ ] **Step 1: Ganti semua "Seluloid" → "LAYAR" di Footer.jsx baris 11, 34**

- [ ] **Step 2: Verifikasi** — footer menampilkan "LAYAR. Katalog pribadi..."

- [ ] **Step 3: Commit**

```bash
git add src/components/Footer.jsx
git commit -m "feat(layar): Footer — branding LAYAR"
```

---

### Task 1.6: PR 1 — build + push

- [ ] **Step 1: `npm run build`** — harus lulus, tidak ada warning

- [ ] **Step 2: Buka browser** — `playwright-cli open http://localhost:5173` → cek warna baru, font DM Serif Display, logo "LAYAR", footer "LAYAR"

- [ ] **Step 3: Commit final + push + buat PR ke `dev`**

---

# PR 2: Komponen Utama (TopBar, HeroCard, Row, PosterCard, Kicker)

### Task 2.1: TopBar.jsx — ganti Navbar (solid)

**Files:**
- Create: `src/components/TopBar.jsx`
- Modify: `src/App.jsx` (import Navbar → TopBar)
- Delete: `src/components/Navbar.jsx` (setelah semua referensi pindah)

**Interfaces:**
- Consumes: `Logo`, `Icons`, `react-router-dom`
- Produces: `<TopBar />` — solid, tidak ada scroll observer, props `active` lewat pathname

```jsx
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { IconBookmark, IconSearch } from './Icons'
import { cx } from '../lib/utils'

export default function TopBar() {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const { pathname, search } = useLocation()
  const tipe = new URLSearchParams(search).get('tipe')

  const submit = (e) => {
    e.preventDefault()
    const s = q.trim()
    if (s) nav(`/cari?q=${encodeURIComponent(s)}`)
  }

  const linkCls = (active) => cx(active && 'active')

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" aria-label="Beranda LAYAR" className="topbar-brand">
          <Logo />
        </Link>
        <nav className="topbar-links" aria-label="Navigasi utama">
          <Link to="/" className={linkCls(pathname === '/')}>Beranda</Link>
          <Link to="/jelajah?tipe=movie" className={linkCls(pathname === '/jelajah' && tipe === 'movie')}>Film</Link>
          <Link to="/jelajah?tipe=tv" className={linkCls(pathname === '/jelajah' && tipe === 'tv')}>Series</Link>
        </nav>
        <form className="topbar-search" onSubmit={submit} role="search">
          <IconSearch size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari..." aria-label="Cari" />
        </form>
        <Link to="/watchlist" className={cx('topbar-action', pathname === '/watchlist' && 'active')}>
          <IconBookmark size={18} />
          <span>Daftar Saya</span>
        </Link>
      </div>
    </header>
  )
}
```

- [ ] **Step 1: Buat `TopBar.jsx`** — copy dari Navbar.jsx, hapus `useEffect` scroll + keyboard shortcut, ganti kelas `nav-*` → `topbar-*`

- [ ] **Step 2: Update `App.jsx`** — `import Navbar` → `import TopBar`, `<Navbar />` → `<TopBar />`

- [ ] **Step 3: Update `layout.css`** — rename `.nav` → `.topbar`, `.nav-solid` → hapus (selalu solid), `.nav-inner` → `.topbar-inner`, dll

- [ ] **Step 4: Delete `Navbar.jsx`**

- [ ] **Step 5: Verifikasi** — topbar selalu solid (tidak transparan, tidak berubah saat scroll), semua link berfungsi

- [ ] **Step 6: Commit**

---

### Task 2.2: HeroCard.jsx — presentational murni

**Files:**
- Create: `src/components/HeroCard.jsx`
- Modify: `src/pages/Home.jsx` (import Hero → HeroCard, pass props)
- Delete: `src/components/Hero.jsx` (setelah Home.jsx pindah)

**Interfaces:**
- Consumes: `img` dari `tmdb.js`, `titleOf, yearOf, mediaTypeOf, ratingOf, catalogNo` dari `utils.js`, `Icons`
- Produces: `<HeroCard item onWatch onToggle saved />` — presentational murni

```jsx
import { img } from '../lib/tmdb'
import { titleOf, yearOf, mediaTypeOf, ratingOf, catalogNo } from '../lib/utils'
import { IconPlay, IconPlus, IconCheck, IconStar } from './Icons'

export default function HeroCard({ item, onWatch, onToggle, saved }) {
  const type = mediaTypeOf(item)
  const title = titleOf(item)
  const rating = ratingOf(item)
  const backdrop = img(item.backdrop_path, 'w1280')

  return (
    <section className="hero">
      {backdrop && (
        <div className="hero-bg">
          <img src={backdrop} alt="" />
        </div>
      )}
      <div className="hero-content">
        <p className="kicker">{catalogNo(item.id)} · ARSIP MINGGU INI</p>
        <h1 className="hero-title">{title}</h1>
        <div className="hero-meta">
          {rating && <span className="star"><IconStar size={15} />{rating}</span>}
          <span>{yearOf(item)}</span>
          <span>{type === 'tv' ? 'Series' : 'Film'}</span>
        </div>
        <p className="hero-overview">{item.overview || 'Sinopsis belum tersedia.'}</p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={onWatch}>
            <IconPlay size={16} /> Tonton
          </button>
          <button className="btn btn-ghost" onClick={onToggle}>
            {saved ? <IconCheck size={16} /> : <IconPlus size={16} />}
            {saved ? 'Tersimpan' : 'Simpan'}
          </button>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 1: Buat `HeroCard.jsx`** — props `item, onWatch, onToggle, saved`, tidak ada `Link`, `useWatchlist`, `toggleWatch`

- [ ] **Step 2: Update `Home.jsx`** — import `HeroCard` bukan `Hero`. Siapkan `onWatch` (navigate ke `/judul/...`) dan `onToggle` (panggil `toggleWatch`). `saved` = hasil `useWatchlist().some(...)`.

```jsx
// Di Home.jsx:
import HeroCard from '../components/HeroCard'
import { useWatchlist, toggleWatch } from '../lib/watchlist'
// ...
const list = useWatchlist()
const saved = list.some((x) => x.type === mediaTypeOf(heroItem) && x.id === heroItem.id)
// ...
<HeroCard
  item={heroItem}
  onWatch={() => nav(`/judul/${mediaTypeOf(heroItem)}/${heroItem.id}`)}
  onToggle={() => toggleWatch(heroItem)}
  saved={saved}
/>
```

- [ ] **Step 3: Delete `Hero.jsx`**

- [ ] **Step 4: Verifikasi** — Hero muncul dengan nomor katalog + "ARSIP MINGGU INI", tombol Tonton & Simpan berfungsi

- [ ] **Step 5: Commit**

---

### Task 2.3: catalogNo() + utils.js

**Files:**
- Modify: `src/lib/utils.js`

**Interfaces:**
- Consumes: tidak ada
- Produces: `catalogNo(id)` — format `NO. 00124`

- [ ] **Step 1: Tambah `catalogNo` ke `utils.js`**

```js
export function catalogNo(id) {
  return `NO. ${String(id).padStart(5, '0')}`
}
```

- [ ] **Step 2: Commit** (bareng dengan HeroCard)

---

### Task 2.4: Row.jsx — strip arsip [01] [02] bukan panah bulat

**Files:**
- Modify: `src/components/Row.jsx`
- Modify: `src/styles/layout.css` / `components.css` (style `.row-strip`)

**Interfaces:**
- Consumes: `PosterCard`, `keyOf` dari `utils.js`
- Produces: `<Row kicker title items numbered />` — navigasi strip arsip `[01] [02] …`

- [ ] **Step 1: Ganti `row-arrow` + `IconChevronL/R` → strip arsip**

```jsx
// Ganti tombol panah dengan daftar nomor urut
const pages = Math.ceil(items.length / 6) // asumsi 6 item per "halaman" strip

<div className="row-body">
  <div className="row-track" ref={track}>
    {items.map((it, i) =>
      numbered ? (
        <div className="rank" key={keyOf(it)}>
          <span className="rank-num" aria-hidden="true">{i + 1}</span>
          <PosterCard item={it} />
        </div>
      ) : (
        <PosterCard item={it} key={keyOf(it)} />
      )
    )}
  </div>
  {pages > 1 && (
    <div className="row-strip" aria-label="Navigasi arsip">
      {Array.from({ length: pages }, (_, i) => (
        <button key={i} className="row-strip-num" onClick={() => slideTo(i)}>
          [{String(i + 1).padStart(2, '0')}]
        </button>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 2: Tambah `slideTo(page)` function** — scroll ke posisi `page * track.clientWidth`

- [ ] **Step 3: CSS** — `.row-strip` horizontal, `.row-strip-num` gaya mono kecil, hover accent

- [ ] **Step 4: Verifikasi** — Row punya `[01] [02] [03]` di bawah, bukan panah kiri/kanan

- [ ] **Step 5: Commit**

---

### Task 2.5: PosterCard.jsx — presentational (props saved + onToggle)

**Files:**
- Modify: `src/components/PosterCard.jsx`
- Modify: `src/components/Row.jsx` (pass `saved` + `onToggle`)
- Modify: `src/pages/Home.jsx` (pass `saved` + `onToggle` ke PosterCard lewat Row)
- Modify: `src/pages/Browse.jsx` (pass `saved` + `onToggle`)
- Modify: `src/components/ContinueRow.jsx` (pass `saved` + `onToggle`)

**Interfaces:**
- Consumes: `img` dari `tmdb.js`, `titleOf, yearOf, mediaTypeOf, ratingOf` dari `utils.js`, `Icons`
- Produces: `<PosterCard item saved onToggle />` — presentational murni

- [ ] **Step 1: Ubah signature PosterCard**

```jsx
// Sebelum: export default function PosterCard({ item })
// Sesudah:
export default function PosterCard({ item, saved, onToggle }) {
```

- [ ] **Step 2: Hapus `useWatchlist`, `toggleWatch` import + pemakaian dalam PosterCard**

- [ ] **Step 3: Ganti chip button**

```jsx
// Sebelum: onClick={() => toggleWatch(item)}
// Sesudah:
onClick={(e) => { e.preventDefault(); onToggle(item) }}
```

- [ ] **Step 4: Update semua caller**

| File | Perubahan |
|------|-----------|
| `Row.jsx` | `saved={list.some(...)} onToggle={toggleWatch}` — hitung di Row, pass ke PosterCard |
| `ContinueRow.jsx` | Sama seperti Row |
| `Browse.jsx` | Grid poster — hitung `saved` per item, pass |

- [ ] **Step 5: Verifikasi** — tombol simpan di poster card tetap berfungsi, saved state benar

- [ ] **Step 6: Commit**

---

### Task 2.6: PR 2 — build + push

- [ ] **Step 1: `npm run build`** — harus lulus

- [ ] **Step 2: Browser verification** — topbar solid, hero ada nomor katalog, row navigasi strip `[01]`, poster card save button berfungsi

- [ ] **Step 3: Commit + push + buat PR ke `dev`**

---

# PR 3: CSS Merge + Clean Code + Admin

### Task 3.1: CSS merge (7 → 4 file)

**Files:**
- Merge: `src/styles/components-ui.css` → `src/styles/components.css`
- Merge: `src/styles/pages-misc.css` + `src/styles/pages-detail.css` → `src/styles/pages.css`
- Modify: `src/main.jsx` (hapus import yang sudah di-merge)
- Delete: `src/styles/components-ui.css`, `src/styles/pages-misc.css`, `src/styles/pages-detail.css`

- [ ] **Step 1: Merge `components-ui.css` ke `components.css`** — append isi `.chip-btn`, `.chip` ke `components.css`, pastikan tidak ada duplikasi selector

- [ ] **Step 2: Merge `pages-misc.css` + `pages-detail.css` ke `pages.css`** — append, pastikan tidak ada konflik

- [ ] **Step 3: Update `main.jsx`** — hapus import `components-ui.css`, `pages-misc.css`, `pages-detail.css`

- [ ] **Step 4: Delete 3 file CSS yang sudah di-merge**

- [ ] **Step 5: Commit**

---

### Task 3.2: AdminLayout → pages/

**Files:**
- Move: `src/components/AdminLayout.jsx` → `src/pages/AdminLayout.jsx`
- Modify: `src/App.jsx` (import path)
- Modify: semua file yang import AdminLayout

- [ ] **Step 1: Move file** — `git mv src/components/AdminLayout.jsx src/pages/AdminLayout.jsx`

- [ ] **Step 2: Update import di `App.jsx`** — `'./components/AdminLayout'` → `'./pages/AdminLayout'`

- [ ] **Step 3: Cek import lain** — `grep` untuk `AdminLayout` import, pastikan tidak ada yang ketinggalan

- [ ] **Step 4: Commit**

---

### Task 3.3: Kicker component

**Files:**
- Create: `src/components/Kicker.jsx`

```jsx
// Kicker: eyebrow "NO. xxxxx · LABEL" — mono, kecil, uppercase
export default function Kicker({ no, label }) {
  return (
    <p className="kicker">
      NO. {String(no).padStart(5, '0')} · {label}
    </p>
  )
}
```

- [ ] **Step 1: Buat `Kicker.jsx`**

- [ ] **Step 2: Pakai di HeroCard** — ganti hardcoded `<p className="kicker">` → `<Kicker no={item.id} label="ARSIP MINGGU INI" />`

- [ ] **Step 3: CSS `.kicker`** — update ke `var(--font-mono)`, `var(--text-xs)`, letter-spacing, uppercase

- [ ] **Step 4: Commit**

---

### Task 3.4: Hapus nilai hardcode di komponen

**Files:**
- Semua file CSS + JSX yang masih pakai warna/nilai hardcode

- [ ] **Step 1: Grep `#` hex di `src/styles/`** — ganti semua hex yang tidak di tokens dengan token yang sesuai

- [ ] **Step 2: Grep `style={{` di `src/components/` + `src/pages/`** — pastikan hanya pakai `var(--*)`, bukan angka hardcode

- [ ] **Step 3: `npm run build`** — harus lulus, tidak ada CSS warning

- [ ] **Step 4: Commit**

---

### Task 3.5: PR 3 — build + push + final

- [ ] **Step 1: `npm run build`** — lulus, bundle size tidak naik signifikan

- [ ] **Step 2: Full browser verification**

  - `/` Home: topbar solid, hero + nomor katalog, row strip arsip, rekomendasi
  - `/jelajah?tipe=movie` Browse: grid, filter, rating slider
  - `/judul/movie/:id` Detail: poster, metadata, tombol tonton
  - `/tonton/movie/:id` Watch: player, dropdown provider
  - `/watchlist` Watchlist: daftar tersimpan
  - `/admin` Admin: login, CRUD entries, settings provider

- [ ] **Step 3: Commit + push + buat PR ke `dev` + tutup issue #25**

- [ ] **Step 4: Re-index codebase-memory** setelah merge