# TMDB Backend Cache — Design

**Topik:** Cache respons TMDB di proxy backend (`server/index.js`) untuk hemat
hit API + kurangi latency. Demo project, single instance, tanpa Redis, tanpa
rate limiter.

**Tanggal:** 2026-08-17
**Status:** Disetujui user (2026-08-17) — siap masuk writing-plans.

---

## Masalah

- Proxy `/3/*` di `server/index.js:37-54` me-**fetch TMDB langsung** tiap request,
  tanpa cache apa pun.
- Klien `src/lib/tmdb.js` **sudah** punya cache (memori + sessionStorage, TTL 5
  menit), tapi itu per-browser/per-user — tidak terbagi antar pengguna.
- Efek: tiap miss cache klien = 1 hit TMDB; data detail yang jarang berubah ikut
  di-fetch berulang. Risiko throttling API key + latency.

## Tujuan (sukses criteria)

1. Respons proxy menyajikan data dari cache in-memory pada hit (tanpa fetch TMDB).
2. Endpoint dinamis (trending/search/dsb.) TTL pendek; statis (detail/config/genre)
   TTL panjang — hemat hit maksimal.
3. Perilaku error tidak berubah: 401/502 tetap terusa ke klien; 404 tidak dicache.
4. Arsitektur rapi, ~15 baris inti, tanpa dependency baru, tanpa Redis, tanpa
   background job, tanpa rate limiter.
5. Tidak menyentuh klien `tmdb.js`, catalog, admin, watchlist, history.

## Arsitektur

Cache inline di handler proxy `/3/*`. Struktur:

```
Map<key, { t: number, data: object }>
  key = subPath + '?' + querystring (tanpa api_key)
```

- **Hit:** `Date.now() - t < ttlFor(subPath)` → return `res-cache: HIT`.
- **Miss:** fetch TMDB → jika `ok`, simpan (evict LRU bila penuh) → return
  `res-cache: MISS`. Jika tidak ok (non-2xx), **jangan simpan** — teruskan respons
  seperti sekarang (401/502/404).
- 404 dari TMDB **tidak dicache** — cegah cache error permanen.

## TTL (2 kelas via prefix path)

| Kelas | Path (`/3/*`) | TTL |
|---|---|---|
| **Dinamis** | mengandung `/search/`, `/trending/`, `/popular`, `/top_rated`, `/upcoming`, `/now_playing` | 10 menit (600s) |
| **Statis** | selain di atas (detail, configuration, genre, credits, dsb.) | 24 jam (86400s) |

Implementasi: fungsi `ttlFor(subPath)` memeriksa daftar token; default statis.

## Proteksi memori

- `MAX_ENTRIES = 500`; saat penuh, evict entri tertua (Map menjaga insertion order
  → hapus `keys().next().value`).
- Tanpa TTL sweep manual — entri basi di-overwrite saat key yang sama diminta lagi;
  Map tak tumbuh tak terbatas karena MAX_ENTRIES.

## File yang disentuh

- `server/index.js` — hanya handler `/3/*` (+ konstanta/fungsi helper di dekatnya).
- Tidak ada file baru (cukup inline — ponytail: jangan buat modul cache terpisah
  untuk ~15 baris).
- Tidak menyentuh file lain.

## Verifikasi

- `npm run build` — tidak terpengaruh (perubahan murni server), tapi jalankan dulu
  untuk memastikan repo sehat.
- Smoke runtime:
  1. `curl /3/trending/movie/day` ×2 → log console server menampilkan `[cache] MISS`
     lalu `[cache] HIT`; respon ke-2 punya header `res-cache: HIT`.
  2. `curl /3/movie/550` ×2 → HIT (TTL statis 24 jam).
  3. 404: `curl /3/movie/0` → tidak dicache (panggil dua kali, dua-duanya MISS).

## Non-goals

- Rate limiter (diputuskan skip — cache dianggap cukup untuk skala demo).
- Redis / shared cache (single instance — in-memory cukup).
- Stale-while-revalidate (klien sudah punya cache sessionStorage; SWR menambah
  kompleksitas tanpa manfaat berarti di demo).
- Cache di sisi klien (sudah ada, tidak diubah).
