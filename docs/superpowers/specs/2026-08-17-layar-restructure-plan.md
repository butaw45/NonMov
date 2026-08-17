# LAYAR — Restructure Plan (file-by-file) + Clean Code

> **Status: DESIGN/REVIEW ONLY — BELUM DIIMPLEMENTASI.**
> Rencana restruktur struktur folder, pemisahan presentational/container, dan clean code.
> Mengikuti `codebase-design` (deep module, seam, interface) dan prinsip "satu sumber kebenaran".

## 1) Struktur folder baru

```
src/
  components/
    ui/            # presentational murni (props masuk, render keluar)
      Button.jsx
      Input.jsx
      Select.jsx
      Chip.jsx
      Kicker.jsx   # eyebrow "NO. xxxxx · LABEL"
      Badge.jsx
      Card.jsx     # kerangka kartu (poster + caption)
    layout/        # struktur halaman
      TopBar.jsx   # ganti Navbar (solid, bukan mengambang)
      BottomNav.jsx
      Footer.jsx
      Row.jsx      # strip arsip (nomor urut, bukan panah)
      Grid.jsx     # grid 12 kolom
    media/         # komponen media (poster, backdrop, hero)
      PosterCard.jsx
      HeroCard.jsx
      Backdrop.jsx
  pages/           # container (fetch data, atur state, pass props)
    Home.jsx
    Browse.jsx
    Detail.jsx
    Watch.jsx
    Search.jsx
    Watchlist.jsx
    NotFound.jsx
    Admin/
      AdminLayout.jsx
      AdminLogin.jsx
      Admin.jsx
      AdminEntry.jsx
      AdminSettings.jsx
  lib/             # data & utilitas murni (tanpa React)
    catalog.js     # akses data TMDB + backend
    format.js      # judul, tahun, rating, durasi, nomor katalog
    tmdb.js        # klien TMDB (endpoint + cache)
    api.js         # klien admin API
    tokens.js      # konstanta warna/spacing untuk JS (jika perlu)
    watchlist.js
    history.js
    hooks.js
    utils.js
  styles/
    tokens.css     # satu sumber kebenaran (warna, type, spacing)
    base.css       # reset, body, focus, scrollbar, selection
    primitives.css # .btn, .field, .card, .chip, .kicker (satu definisi)
    layout.css     # .container, .page-pad, .grid, .row, .topbar
    pages/
      home.css
      browse.css
      detail.css
      watch.css
      admin.css
```

## 2) Pemetaan perubahan (file lama -> baru)

| File lama | File baru | Perubahan |
|-----------|-----------|-----------|
| `src/components/Navbar.jsx` | `src/components/layout/TopBar.jsx` | solid, bukan mengambang; props `active` eksplisit |
| `src/components/Hero.jsx` | `src/components/media/HeroCard.jsx` | terima `item`, `onWatch`, `onToggle` (tanpa `Link`/`useWatchlist`) |
| `src/components/Row.jsx` | `src/components/layout/Row.jsx` | strip arsip (nomor urut), bukan panah bulat |
| `src/components/PosterCard.jsx` | `src/components/media/PosterCard.jsx` | terima `item`, `saved`, `onToggle` sebagai props |
| `src/components/ContinueRow.jsx` | `src/components/layout/ContinueRow.jsx` | tetap, tapi pakai `Card` + `Kicker` dari ui/ |
| `src/components/BottomNav.jsx` | `src/components/layout/BottomNav.jsx` | tetap, pakai token baru |
| `src/components/Footer.jsx` | `src/components/layout/Footer.jsx` | tetap, pakai token baru |
| `src/components/Icons.jsx` | `src/components/ui/Icons.jsx` | tetap, tambah ikon baru jika perlu |
| `src/components/Logo.jsx` | `src/components/ui/Logo.jsx` | ganti wordmark jadi "LAYAR" |
| `src/components/Skeletons.jsx` | `src/components/ui/Skeletons.jsx` | tetap, pakai token baru |
| `src/components/ErrorBoundary.jsx` | `src/components/ui/ErrorBoundary.jsx` | tetap |
| `src/components/AdminLayout.jsx` | `src/pages/Admin/AdminLayout.jsx` | pindah ke pages/Admin |
| `src/pages/Admin*.jsx` | `src/pages/Admin/Admin*.jsx` | pindah ke subfolder Admin |
| `src/styles/tokens.css` | `src/styles/tokens.css` | ganti isi (palet + type + spacing baru) |
| `src/styles/layout.css` | `src/styles/layout.css` | .topbar, .grid, .row, .container |
| `src/styles/components.css` | `src/styles/primitives.css` | .btn, .field, .card, .chip, .kicker |
| `src/styles/pages*.css` | `src/styles/pages/*.css` | pecah per halaman yang benar-benar unik |

## 3) Clean code (per codebase-design)

### Prinsip
- **Deep module**: `lib/catalog.js` menyembunyikan kompleksitas TMDB + backend di balik interface kecil (`getHome()`, `getDetail(type,id)`, `search(q)`).
- **Seam**: interface `catalog.js` adalah seam; adapter = klien TMDB langsung vs proxy backend.
- **Presentational vs container**: komponen di `components/ui|layout|media` murni presentational (props masuk, render keluar); `pages/` adalah container yang fetch data dan pass props.

### Contoh perubahan interface

**Sebelum (PosterCard):**
```jsx
// komponen tahu tentang watchlist + routing
export default function PosterCard({ item }) {
  const list = useWatchlist()
  const saved = list.some((x) => x.type === type && x.id === item.id)
  return <Link className="card" to={`/judul/${type}/${item.id}`}>...</Link>
}
```

**Sesudah (PosterCard):**
```jsx
// presentational murni: props masuk, render keluar
export default function PosterCard({ item, saved, onToggle }) {
  return (
    <Card as="a" href={`/judul/${type}/${item.id}`}>
      <Card.Poster src={poster} alt={title} />
      <Card.Caption title={title} meta={meta} />
      <Card.Chip saved={saved} onToggle={onToggle} />
    </Card>
  )
}
```

**Sebelum (Hero):**
```jsx
// komponen tahu tentang routing + watchlist
export default function Hero({ item }) {
  const list = useWatchlist()
  return <section>...</section>
}
```

**Sesudah (HeroCard):**
```jsx
// presentational murni
export default function HeroCard({ item, onWatch, onToggle, saved }) {
  return (
    <section className="hero">
      <Backdrop src={backdrop} />
      <Kicker no="00124" label="Arsip Minggu Ini" />
      <h1 className="hero-title">{title}</h1>
      <p className="hero-meta">{meta}</p>
      <Button variant="primary" onClick={onWatch}>Tonton</Button>
      <Button variant="ghost" onClick={onToggle}>{saved ? 'Tersimpan' : 'Simpan'}</Button>
    </section>
  )
}
```

### Interface `lib/catalog.js` (deep module)

```js
// Interface kecil, implementasi dalam (TMDB + backend + cache)
export async function getHome() { /* ... */ }
export async function getDetail(type, id) { /* ... */ }
export async function search(q, page = 1) { /* ... */ }
export async function browse(params) { /* ... */ }
```

### Interface `lib/format.js` (util murni)

```js
export function titleOf(item) { /* ... */ }
export function yearOf(item) { /* ... */ }
export function ratingOf(item) { /* ... */ }
export function catalogNo(id) { return `NO. ${String(id).padStart(5, '0')}` }
export function runtimeLabel(mins) { /* ... */ }
```

## 4) Langkah migrasi (urutan aman)

1. **Tokens dulu**: ganti `tokens.css` (palet + type + spacing baru) — semua komponen ikut berubah.
2. **Primitives**: buat `primitives.css` (.btn, .field, .card, .chip, .kicker) — satu definisi.
3. **Layout**: buat `layout.css` (.topbar, .grid, .row, .container).
4. **Komponen ui/**: buat Button, Input, Select, Chip, Kicker, Card — migrasi dari komponen lama.
5. **Komponen layout/**: TopBar, Row, Grid, Footer, BottomNav.
6. **Komponen media/**: PosterCard, HeroCard, Backdrop.
7. **Pages**: ubah jadi container (fetch data, pass props) — tanpa styling inline.
8. **Lib**: pisahkan `catalog.js` (data) dari `format.js` (presentasi).
9. **Admin**: pindah ke `pages/Admin/` — tidak ikut rebrand visual (tetap fungsional).

## 5) Non-goals (fase ini)

- Bukan mengubah alur data TMDB / admin API.
- Bukan menambah fitur baru (#23, #24 tetap terpisah).
- Bukan mengubah backend / server.
- Bukan implementasi — hanya desain + rencana.
