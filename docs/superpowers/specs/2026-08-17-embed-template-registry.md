# Embed Template Registry (Unifikasi Provider) — Design

> Issue: [#19](https://github.com/butaw45/NonMov/issues/19) lanjutan · 2026-08-17
> Status: DESAIN — belum diimplementasikan
> Supersedes sebagian: `2026-08-17-provider-registry-design.md` (skema provider `type:"viduki"` diubah jadi `type:"embed"` template)

## Problem

Provider registry (#19) terkunci ke **satu tipe hardcoded**: `viduki`. URL embed dibangun internal oleh `IframePlayer` (base viduki + api + tmdb_id). Akibat:
1. Provider embed lain (mis. **videasy**: `https://player.videasy.net/movie/{id}`, `…/tv/{id}/{season}/{episode}`) **tak bisa diinput** — UI & skema hanya kenal viduki.
2. Menambah provider baru = edit kode (registry statis), bukan konfigurasi.
3. `video_type: 'embed'` per-entry (self override) sudah ada di skema+form tapi **tak pernah dirender** di Watch — fitur rusak/no-op.

## Keputusan (di-approve user)

1. **Unifikasi**: semua provider embed jadi **URL template**. Tipe viduki-spesifik & `IframePlayer` (logika fallback antar-API 1–4) **dihapus**.
2. **Placeholder**: `{tmdb_id}`, `{season}`, `{episode}`.
3. **Render**: satu jalur iframe generik — dipakai provider template global **dan** per-entry `video_type:'embed'` (sekaligus memperbaiki fitur rusak itu).
4. **Warna Player dihapus** — field `viduki_color`/warna **tidak dipakai** (template polos). Jangan tambahkan.

## Konsekuensi yang diterima

- viduki **auto-fallback antar API hilang** → fallback jadi manual via dropdown provider (cross-origin iframe tak bisa deteksi kegagalan).
- viduki API 1/3/4 bila masih dipakai → ditambah sebagai provider `embed` terpisah (template beda `/{api}/`).

## Non-goals

- Tidak menambah placeholder selain `{tmdb_id}`, `{season}`, `{episode}`.
- Tidak menyentuh ArtPlayer (HLS/DASH self-hosted), autoplay, resume, history.
- Tidak ada deteksi error iframe / auto-fallback generik.

---

## Arsitektur

Satu mekanisme embed: **template URL → substitusi placeholder → `<iframe>`**. Semua provider network (viduki, videasy, dst) adalah data di `config.json`, bukan kode.

```
config.json providers[]
   └─ server/config.js  (getConfig/updateConfig + validasi template + migrasi)
        ├─ GET /api/config (publik) ─┐
        └─ PUT /admin/api/config ────┤
                                     ▼
   src/lib/providers.js            fetchConfig()
     buildEmbedUrl(template,{tmdb_id,season,episode})   ← deep seam (substitusi)
     resolveProviders(entry,config,kind)  ← urutan tak berubah
                                     ▼
   src/pages/Watch.jsx
     active.type==='embed'              → <iframe src={buildEmbedUrl(...)}>
     active.type==='self' && video_type==='embed' → <iframe src={active.video_url}>
     active.type==='self' && hls/dash   → ArtPlayer (tak berubah)
```

**Seam**: `buildEmbedUrl` — satu fungsi murni, semua render embed lewat situ. `IframePlayer` dihapus; kompleksitas fallback-nya hilang (dipindah ke konfigurasi = tambah provider per API bila perlu).

---

## Skema Data

### `server/config.json` → `providers[]`

```jsonc
{
  "providers": [
    {
      "id": "p_a1b2c3d4",
      "type": "embed",
      "label": "videasy",
      "movie_url": "https://player.videasy.net/movie/{tmdb_id}",
      "tv_url": "https://player.videasy.net/tv/{tmdb_id}/{season}/{episode}",
      "media_type": null,     // null = keduanya | "movie" | "tv"
      "enabled": true
    },
    {
      "id": "p_e5f6a7b8",
      "type": "embed",
      "label": "viduki API 2",
      "movie_url": "https://www.viduki.net/2/movie/{tmdb_id}",
      "tv_url": "https://www.viduki.net/2/tv/{tmdb_id}/{season}/{episode}",
      "media_type": null,
      "enabled": true
    }
  ]
  // Field legacy viduki_* DIHAPUS setelah migrasi
}
```

Field per provider:
- `id` — string unik (`p_<rand>`), dibuat server, tak diedit.
- `type` — hanya `"embed"`.
- `label` — nama tampil di dropdown Watch.
- `movie_url` — template; **wajib berisi `{tmdb_id}`**.
- `tv_url` — template; **wajib bila `media_type` ∈ {null,"tv"}**; `null`/absent bila movie-only. Placeholder `{season}`/`{episode}` hanya relevan di sini.
- `media_type` — `null` | `"movie"` | `"tv"`.
- `enabled` — boolean.
- **Tidak ada** `viduki_api`, `viduki_color`, `viduki_type`, atau field warna.

### `server/catalog.json` entry (override self) — tak berubah

`entry.providers[]` tetap hanya `type:"self"` (`video_url` + `video_type: hls|dash|embed`). Kini `video_type:'embed'` benar-benar dirender.

### Migrasi backward-compat (config.js)

Jika `providers[]` punya item lama `type:"viduki"` → ubah jadi `embed` template:
```
movie_url = https://www.viduki.net/{viduki_api}/movie/{tmdb_id}
tv_url    = https://www.viduki.net/{viduki_api}/tv/{tmdb_id}/{season}/{episode}
```
Warna di-drop (per keputusan #4). Field top-level `viduki_enabled`/`viduki_default_api`/`viduki_color` dihapus dari file. Migrasi berjalan sekali lalu simpan.

---

## Perubahan per modul

### `server/config.js`
- `KNOWN_TYPES` → `['embed']` saja.
- `validateProvider`: `movie_url` string URL valid + mengandung `{tmdb_id}`; `tv_url` (bila ada) string URL valid + mengandung `{tmdb_id}`; konsistensi `tv_url` vs `media_type`; `enabled` boolean. **Hapus** validasi `viduki_api`/`viduki_color`.
- Migrasi legacy → `embed` (lihat atas). Hapus seed dari `viduki_enabled`.
- Pertahankan `getConfig`/`updateConfig`; `updateConfig` tetap preserve unknown top-level keys (fix review #19).

### `src/lib/providers.js`
- **Hapus** `PROVIDER_TYPES` registry (tak ada lagi tipe statis) + cabang viduki di `flatToProviders`.
- **Tambah** `buildEmbedUrl(template, { tmdb_id, season, episode })`:
  ```js
  template
    .replaceAll('{tmdb_id}', String(tmdb_id))
    .replaceAll('{season}', String(season ?? ''))
    .replaceAll('{episode}', String(episode ?? ''))
  ```
- `resolveProviders(entry, config, kind)` — urutan **tak berubah** (self override → flat self → global pool filter `enabled`+`media_type`).

### `src/pages/Watch.jsx`
- Ganti branch `showViduki`/IframePlayer:
  - `active?.type === 'embed'` → `<iframe className="player-box" src={buildEmbedUrl(kind==='tv'?active.tv_url:active.movie_url, {tmdb_id, season, episode})} allowFullScreen />`
  - `active?.type === 'self' && active.video_type === 'embed'` → `<iframe src={active.video_url} allowFullScreen />`
  - `active?.type === 'self' && (hls|dash)` → ArtPlayer (tak berubah).
- Hapus `vidukiTmdbId`, `isVidukiActive`, import IframePlayer. `tmdbId` untuk template = `catalogEntry?.tmdb_id ?? Number(id)`.
- Dropdown provider tak berubah (kini menampilkan semua embed provider).

### `src/pages/AdminSettings.jsx`
- Form "Tambah Provider" → field: **Label**, **Media Type** (select: semua/movie/tv), **URL Template Movie**, **URL Template TV** (opsional bila movie), **Aktif** (toggle). **Tanpa** dropdown Tipe Provider (semua `embed`), **tanpa** warna.
- List provider: label · badge `embed` · badge media_type · URL preview · toggle aktif · hapus.
- Kirim `providers[]` apa adanya (preserve `id`) → `PUT /admin/api/config`.

### `src/pages/AdminEntry.jsx`
- Tak berubah struktural; `video_type:'embed'` per-entry kini berfungsi (iframe). Pastikan form tetap menawarkan opsi embed.

### Dihapus
- `src/components/IframePlayer.jsx` + import + CSS terkait.
- Referensi `viduki_color`/`viduki_api` di semua file.

---

## Alur (end-to-end)

1. Admin tambah provider di `/admin/settings` (label, media, template movie/tv) → `PUT /admin/api/config` → validasi → simpan `providers[]`.
2. User buka `/tonton/<kind>/<id>` → `fetchConfig()` + `catalogLookup(id)`.
3. `resolveProviders` → self override / global pool (filter kind+enabled).
4. Watch: `embed` → iframe via `buildEmbedUrl`; `self embed` → iframe; `self hls/dash` → ArtPlayer. >1 → dropdown.

## Error handling
- Template tanpa `{tmdb_id}` / URL invalid → 400 pesan spesifik (server), tampil di `error-box`.
- TV dibuka tapi provider tak punya `tv_url` → provider tak lolos filter `media_type`/`kind` → di-skip.
- Pool kosong + tak ada override → no-stream (existing).

## Pengujian
1. `npm run build` lulus.
2. Smoke config.js: add template valid; invalid (tanpa `{tmdb_id}`) throw; migrasi viduki→embed; unknown key survive.
3. Smoke `buildEmbedUrl`: movie & tv substitusi benar.
4. Live: `/admin/settings` tambah videasy → buka judul → dropdown berisi videasy → iframe termuat URL tersubstitusi; per-entry `embed` render iframe.

## Bukan bagian fase ini (defer)
- Warna/theming player (dihapus sengaja; tambah lagi bila perlu lewat template query manual).
- Auto-fallback / health-check embed.
- Placeholder tambahan (`{imdb_id}`, slug, token query).
