# Plan: Provider Selector (Player Revamp)

## Konsep

Tambahkan dropdown/listbox pemilihan provider di area player, mirip hearti.tv. Viewer bisa pilih sumber video untuk judul yang sama — self-hosted, viduki, atau provider lain yang tersedia.

Screenshot referensi: hearti.tv menampilkan listbox dengan opsi provider (videasy, vidsuper, toustream, vidlink, dll) di atas player.

## Current Behavior

Watch.jsx menggunakan binary logic:
```
entry?.video_provider === 'viduki' || (!entry && config?.viduki_enabled)
  → IframePlayer (viduki)
else
  → ArtPlayer (self-hosted)
```

Tidak ada pilihan untuk user — sistem yang memilih.

## Desired Behavior

```
┌─────────────────────────────────────┐
│ Provider: [Self-hosted ▼]           │  ← dropdown di atas player
├─────────────────────────────────────┤
│                                     │
│         [Player Area]               │
│                                     │
└─────────────────────────────────────┘
```

User pilih provider → player switch ke provider itu.

## Data Model

### Schema catalog entry (ditambah providers array)

```json
{
  "id": "1399-tv-seed2",
  "tmdb_id": 1399,
  "title": "Game of Thrones",
  "status": "published",
  "providers": [
    {
      "type": "self",
      "video_url": "https://...m3u8",
      "video_type": "hls",
      "label": "Self-hosted"
    },
    {
      "type": "viduki",
      "viduki_api": 2,
      "viduki_type": "tv",
      "viduki_color": "#ef4444",
      "label": "viduki.net"
    }
  ]
}
```

**Backward compat**: jika `providers` kosong/tidak ada, derive dari flat fields yang sudah ada (`video_provider`, `video_url`, `viduki_api`, dll). Entry existing tetap jalan tanpa migrasi.

### Provider types

| Type | Source | Player | Config |
|------|--------|--------|--------|
| `self` | `video_url` (HLS/DASH) | ArtPlayer + hls.js | `video_url`, `video_type` |
| `viduki` | viduki.net embed | IframePlayer | `viduki_api`, `viduki_type`, `viduki_color` |

### Global fallback (no entry)

Jika tidak ada entry di catalog + `viduki_enabled` → providers = `[{type: 'viduki', label: 'viduki.net (global)', ...config}]`

## Frontend Changes

### `src/pages/Watch.jsx`

**State baru:**
```js
const [activeProvider, setActiveProvider] = useState(null) // index ke providers[]
```

**Derive providers:**
```js
// 1. Entry ada → providers dari entry (atau derive dari flat fields)
// 2. Entry tidak ada + viduki_enabled → [{type: 'viduki', ...config}]
// 3. Entry tidak ada + viduki disabled → [] (tidak ada provider)
```

**Render:**
```jsx
{providers.length > 1 && (
  <select value={activeProvider} onChange={...}>
    {providers.map((p, i) => (
      <option key={i} value={i}>{p.label}</option>
    ))}
  </select>
)}

{activeProvider?.type === 'self' && <ArtPlayer src={...} />}
{activeProvider?.type === 'viduki' && <IframePlayer ... />}
{providers.length === 1 && <auto-render single provider>}
```

**Switching:**
- Ganti `activeProvider` → trigger re-render dengan player baru
- Reset state player (reset ArtPlayer instance, reset IframePlayer API counter)

### `src/components/IframePlayer.jsx`

Tidak diubah — sudah stateless terhadap provider selection.

### `src/components/` (ArtPlayer)

Tidak diubah — sudah stateless terhadap provider selection.

### `src/pages/AdminEntry.jsx`

**Tambah UI multi-provider:**
- Daftar providers (list dengan remove button)
- "Tambah Provider" button → modal/form:
  - Select type: `self` atau `viduki`
  - Type-specific fields (video_url untuk self, viduki_api/viduki_type/viduki_color untuk viduki)
  - Label input (opsional, default "Self-hosted" / "viduki.net")
- Simpan sebagai `providers` array di entry

**Backward compat migration:**
- Saat edit entry lama (tanpa `providers`): auto-generate dari flat fields
- Saat save: simpan sebagai `providers` array

### `src/lib/api.js`

- `adminApi.saveEntry(data)` — kirim `providers` array ke backend
- `adminApi.getEntries()` — tetap sama

### `src/App.jsx`

Tidak diubah.

### `src/components/AdminLayout.jsx`

Tidak diubah.

## Backend Changes

### `server/index.js` (public API)

Tidak diubah — `/api/catalog/lookup` dan `/api/catalog/:id` tetap return entry (termasuk `providers` array).

### `server/adminRoutes.js` (admin API)

Tidak diubah — `GET/POST/PUT/DELETE /admin/api/entries` tetap sama. Backend tidak perlu validasi `providers` array (frontend yang handle).

### `server/admin.js`

Tidak diubah — `createEntry()` dan `updateEntry()` butuh sedikit update untuk handle `providers` array, tapi bisa backward-compatible.

### `server/catalog.json`

Migrasi entry existing:
```json
{
  "providers": [
    {"type": "self", "video_url": "...", "video_type": "hls", "label": "Self-hosted"}
  ]
}
```

## Edge Cases

| Kasus | Perilaku |
|-------|----------|
| Entry dengan 1 provider | Dropdown tidak muncul (hanya 1 pilihan) |
| Entry dengan 2+ provider | Dropdown muncul, default pilih pertama |
| No entry + viduki enabled | Dropdown dengan 1 opsi "viduki.net (global)" |
| No entry + viduki disabled | "Belum tersedia di server kami" |
| Switching provider mid-playback | Reset player, tampil loading state |
| Provider viduki + sandbox fix | IframePlayer tanpa sandbox attribute (sudah di-fix) |
| Draft entry + provider selector | Entry draft di-filter public API (issue #12) → tidak muncul |

## Files Changed

| File | Perubahan |
|------|-----------|
| `src/pages/Watch.jsx` | Tambah state `activeProvider`, derive `providers`, dropdown UI, switch logic |
| `src/pages/AdminEntry.jsx` | Multi-provider form UI, backward compat migration |
| `src/lib/api.js` | Tambah `providers` ke payload saveEntry |
| `server/admin.js` | Handle `providers` array di create/update (backward compat) |
| `server/catalog.json` | Migrasi entry existing ke `providers` array |

## Verifikasi

1. Entry dengan 2 provider → dropdown muncul, switch正常工作
2. Entry dengan 1 provider → tidak ada dropdown, auto-play
3. No entry + viduki → dropdown "viduki.net (global)"
4. Admin add/remove provider → tersimpan di catalog.json
5. Build + smoke test

## Catatan

Ini adalah **revamp** yang lebih besar dari issue terdahulu. Perlu branch baru (`feature/provider-selector`). Stack di atas `dev` (yang sudah include #8 + #10 + sandbox fix).
