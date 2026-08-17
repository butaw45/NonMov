# Provider Registry Global — Design

> Issue: [#19](https://github.com/butaw45/NonMov/issues/19) · 2026-08-17
> Status: DESAIN — belum diimplementasikan

## Problem

Penyedia tontonan dikelola **per-entry**: array `providers[]` di `catalog.json` diisi satu-satu lewat `AdminEntry.jsx` untuk tiap film/series. Satu-satunya provider embed global (`/admin/settings`) hanya toggle tunggal viduki (`viduki_enabled`, `viduki_default_api`, `viduki_color`).

Akibat:
1. Admin harus menambah provider yang sama ke **setiap** judul bila mau menimpanya.
2. Global config terbatas ke **satu provider network** (viduki), tak pluggable untuk source lain.
3. Setting provider tak menimpa semua film & series sekaligus.

## Tujuan

1. **Pool provider global (registry pluggable)** — konfigurasi sekali di `/admin/settings`, menimpa **semua** film & series. Registry type di kode siap menampung banyak provider network (viduki dulu, lainnya kemudian).
2. **Self-hosted tetap per-judul** — URL video inheren spesifik-per-judul; tetap override di form tiap judul.
3. Tab provider embed di wizard tambah/edit judul dihapus; per-judul hanya menyisakan tambah self-hosted (override).

## Non-goals (fase ini)

- Tidak menambah provider embed baru selain viduki — *registry-nya* disiapkan, *isinya* viduki.
- Tidak menyentuh autoplay/resume/history/IframePlayer fallback.
- Tidak mengubah arti `self.video_url` — tetap URL HLS/DASH/embed per judul.

---

## Arsitektur

Dua lapisan provider, berpisah tegas:

| Lapisan | Data | Di mana disimpan | Tujuan |
|---|---|---|---|
| **Global pool** (embed/API) | instance provider network (viduki dkk) | `server/config.json` → `providers[]` | Menimpa SEMUA judul yang tidak punya override |
| **Override self-hosted** | URL video per judul | `server/catalog.json` → `entry.providers[]` | Khusus satu judul; menimpa pool global untuk judul itu |

Dibaca di sisi client:
`config.json` → `config.js getConfig()` → `PUT/GET /admin/api/config` (admin) & `GET /api/config` (publik) → `fetchConfig()` (client) → `resolveProviders(entry, config, kind)` (Watch/AdminEntry).

---

## Skema Data

### `server/config.json` (global pool)

```jsonc
{
  "providers": [
    {
      "id": "p_viduki_2",
      "type": "viduki",
      "label": "viduki.net — Multi Language",
      "viduki_api": 2,
      "viduki_color": "#ef4444",
      "media_type": null,      // null = keduanya | "movie" | "tv"
      "enabled": true
    }
  ],
  // Field legacy — dipertahankan utk backward-compat, dipakai migrasi satu kali lalu tak dipakai UI
  "viduki_enabled": true,
  "viduki_default_api": 2,
  "viduki_color": "#ef4444"
}
```

Field per provider:
- `id` — string unik (dibuat server, mis. `p_<rand>`), tak diedit user.
- `type` — kunci registry (sekarang `viduki`; masa depan `others`).
- `label` — nama tampil di dropdown Watch.
- `viduki_api` — 1–4 (hanya type viduki).
- `viduki_color` — `#RRGGBB` (hanya type viduki).
- `media_type` — `null`|`"movie"`|`"tv"`; null = berlaku kedua jenis.
- `enabled` — toggle; tak menimpa judul apa pun saat false.

### `server/catalog.json` entry (override self-hosted)

```jsonc
{
  "providers": [
    { "type": "self", "label": "Self-hosted", "video_url": "https://…/playlist.m3u8", "video_type": "hls" }
  ]
}
```

Hanya `type: "self"` yang tersisa di per-entry. Provider `viduki` per-entry dihapus dari model & form.

**Migrasi backward-compat** (`config.js getConfig`): jika `providers` absent DAN `viduki_enabled === true` → seed `providers = [{ type:"viduki", label:"viduki.net", viduki_api: viduki_default_api || 2, viduki_color: viduki_color || "#ef4444", media_type:null, enabled:true }]`. Simpan hasil seed (sekali).

---

## Registry type — `src/lib/providers.js`

```js
// Provider type registry (pluggable). Menambah source embed baru = tambah
// satu entri statis di sini; sisanya (resolve, UI, validasi) otomatis ikut.
export const PROVIDER_TYPES = {
  viduki: {
    label: 'viduki.net',
    fields: ['viduki_api', 'viduki_color'],
    defaultApi: 2,
  },
  // nanti: sourceX: { label, fields }
}
```

`normalizeProvider`, `entryProviders`, `flatToProviders` dipertahankan dengan cakupan disesuaikan: per-entry hanya menerima `self`.

`resolveProviders` (urutan baru):
1. `entry.providers` (self) ada → **override**: hanya itu (dropdown = [self]).
2. Tidak ada override → global pool: filter `enabled === true` && (`media_type` null == kedua jenis || `media_type === kind`).
3. Kosong → `[]` (Watch render no-stream).

---

## UI

### `AdminSettings.jsx` (`/admin/settings`) — pengelola pool global
- Hapus toggle tunggal viduki. Ganti daftar provider:
  - Tabel/list: `<label>` · badge `<type>` · `media_type` · toggle `enabled` · tombol Hapus.
  - Form "Tambah Provider" (mirip form per-entry lama): select `type` (Tipe Provider), label, field per type (`viduki_api` 1–4, `viduki_color`), `media_type` select.
  - Simpan satu tombol → `PUT /admin/api/config` dengan `providers[]`.
- Field viduki legacy tidak lagi dirender (nilai lama dipakai migrasi).

### `AdminEntry.jsx` (wizard tambah/edit judul)
- Section "Penyedia Tontonan" dipangkas → hanya **self-hosted override**:
  - Hapus opsi `viduki` dari select "Tipe Provider".
  - Label halaman jelas "Video self-hosted (override judul ini)".
  - logika `addViduki*` state dihapus.

### `Watch.jsx`
- Tidak berubah struktural: `resolveProviders(...)` baru menghasilkan daftar; dropdown >1, auto-play 1, no-stream 0. `viduki` dibuka via `IframePlayer` (sama seperti sekarang).

---

## Backend

### `server/config.js`
- `getConfig()`: tambah `providers[]` dari config; jalankan migrasi backward-compat bila perlu.
- `updateConfig(patch)`: terima `providers[]`; validasi tiap item (type dikenal di registry, viduki_api ∈ 1–4, viduki_color cocok regex, media_type ∈ {null,"movie","tv"}, enabled boolean); beri `id` bila absent; tolak item tak dikenal. Field viduki legacy tetap diterima (untuk migrasi), tapi boleh jadi tak dirender.
- Pertahankan `VIDUKI_APIS`, `COLOR_RE`, `getConfig`/`updateConfig` ekspor.

### `server/admin.js`
- `normalizeProviders` (per-entry) dirobohkan: hanya menerima `type:"self"`; entri `viduki` di-ignore/dropped (validasi lenient, jangan hard-error supaya migrasi data lama bersih).

### `server/adminRoutes.js`
- `GET/PUT /admin/api/config` sudah ada — tak berubah signatur, hanya payload `providers[]` baru.

### `server/index.js`
- `GET /api/config` publik sudah mengembalikan `getConfig()` — `providers[]` otomatis ikut. Tanpa perubahan.

---

## Alur Data (end-to-end)

1. Admin tambah provider viduki global di `/admin/settings` → `PUT /admin/api/config` → `updateConfig` validasi & simpan `providers[]` ke `config.json`.
2. User buka `/tonton/<movie|tv>/<id>` → client `fetchConfig()` ambil `/api/config` (berisi `providers[]`) + `catalogLookup(id)` ambil entry (berisi self override, bila ada).
3. `resolveProviders(entry, config, kind)`:
   - entry punya self override → dropdown = [self].
   - else → global pool filter kind + enabled.
4. Watch render seperti biasa (dropdown/auto/no-stream).

---

## Error Handling

- `PUT /admin/api/config` dengan provider tak valid → 400 + pesan spesifik (server), ditampilkan di `error-box` AdminSettings.
- Entry catalog dengan provider viduki lama → `normalizeProviders` drop diam-diam (migrasi data, bukan hard error).
- Pool kosong + tak ada override → halaman no-stream (perilaku Watch existing).

---

## Pengujian

1. `npm run build` lulus.
2. Smoke backend: `curl /api/config` menampilkan `providers[]`; `node` CRUD sederhana panggil `updateConfig({providers:[…]})` valid & invalid.
3. Smoke frontend: `/admin/settings` tambah provider → tersimpan; buka judul tanpa override → dropdown menampilkan pool; judul dengan self override → hanya self.
4. Migrasi: config lama (`viduki_enabled:true` tanpa `providers`) → `getConfig` seed satu provider viduki.

---

## Bukan Bagian Fase Ini (defer)

- Menambah provider embed non-viduki (cukup registry siap).
- Union pool + override (saat ini override = mengganti pool untuk judul itu; keputusan konsisten dengan perilaku eksisting di `resolveProviders`).
