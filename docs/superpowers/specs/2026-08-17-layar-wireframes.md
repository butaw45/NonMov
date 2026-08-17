# LAYAR — ASCII Wireframe (Home, Browse, Detail, Watch)

> **Status: DESIGN/REVIEW ONLY — BELUM DIIMPLEMENTASI.**
> Wireframe tekstual untuk 4 halaman inti. Semua halaman pakai top bar (bukan navbar mengambang),
> eyebrow `NO. xxxxx · LABEL`, dan strip arsip untuk navigasi row.

---

## HOME (`/`)

```
+--------------------------------------------------------------+
| LAYAR   [Beranda] [Film] [Series]      [Cari...        ] [=] | <- top bar solid
+--------------------------------------------------------------+
|                                                              |
|   NO. 00124 · ARSIP MINGGU INI                               | <- eyebrow (mono)
|                                                              |
|   Judul Besar Sekali                                         | <- display 40px
|   * 8.4 · 2024 · Film · 2j 10m                               | <- meta (mono)
|                                                              |
|   Sinopsis singkat dua-tiga kalimat yang menjelaskan          |
|   kenapa judul ini masuk arsip minggu ini.                    |
|                                                              |
|   [> Tonton]  [+ Simpan]                                     | <- CTA accent
|                                                              |
|   (backdrop besar, gelap, dengan grain tipis)                 |
+--------------------------------------------------------------+
|  ARSIP TERBARU                                    [01]..[12] | <- strip arsip (nomor)
|  +----+ +----+ +----+ +----+ +----+ +----+                   |
|  | 01 | | 02 | | 03 | | 04 | | 05 | | 06 |  ..               |
|  |post| |post| |post| |post| |post| |post|                   |
|  |NO..| |NO..| |NO..| |NO..| |NO..| |NO..|                   |
|  +----+ +----+ +----+ +----+ +----+ +----+                   |
+--------------------------------------------------------------+
|  KARENA ANDA MENONTON "Judul X"                              |
|  +----+ +----+ +----+ +----+ +----+ +----+                   |
|  | .. | | .. | | .. | | .. | | .. | | .. |                   |
|  +----+ +----+ +----+ +----+ +----+ +----+                   |
+--------------------------------------------------------------+
|  FOOTER - LAYAR · Arsip pribadi · Bukan afiliasi TMDB         |
+--------------------------------------------------------------+
```

---

## BROWSE (`/jelajah`)

```
+--------------------------------------------------------------+
| LAYAR   [Beranda] [Film] [Series]      [Cari...        ] [=] |
+--------------------------------------------------------------+
|  JELAJAH                                                     |
|  [Film] [Series]   <- tab tipe                               |
|                                                              |
|  Rating min [----o--] 7.0+   Negara [Semua v]                | <- filter baru (#24)
|  Genre [Semua v]   Tahun [Semua v]   Urutkan [Populer v]     |
|                                                              |
|  +----+ +----+ +----+ +----+ +----+ +----+                   |
|  | 01 | | 02 | | 03 | | 04 | | 05 | | 06 |  .. grid 6 kolom  |
|  +----+ +----+ +----+ +----+ +----+ +----+                   |
|  +----+ +----+ +----+ +----+ +----+ +----+                   |
|  | 07 | | 08 | | 09 | | 10 | | 11 | | 12 |                   |
|  +----+ +----+ +----+ +----+ +----+ +----+                   |
|                                                              |
|              [ Muat lebih banyak ]                            |
+--------------------------------------------------------------+
```

---

## DETAIL (`/judul/:type/:id`)

```
+--------------------------------------------------------------+
| LAYAR   [Beranda] [Film] [Series]      [Cari...        ] [=] |
+--------------------------------------------------------------+
|  <- Kembali                                                  |
|                                                              |
|  +--------+   NO. 00124 · FILM                               |
|  |        |   Judul Besar Sekali                             |
|  | poster |   * 8.4 · 2024 · 2j 10m · [Genre] [Genre]        |
|  |        |                                                  |
|  |  2:3   |   Sinopsis panjang. Beberapa kalimat yang        |
|  |        |   menjelaskan isi film tanpa spoiler berlebihan. |
|  +--------+                                                  |
|             [> Tonton]  [+ Simpan]  [^ Platform legal]       |
|                                                              |
|  Pemeran:  Nama A, Nama B, Nama C                            |
|  Sutradara: Nama D                                           |
|                                                              |
|  EPISODE (jika series)                                       |
|  S1 v  [01] Pilot  [02] ..  [03] ..                          |
|                                                              |
|  SERUPA                                                      |
|  +----+ +----+ +----+ +----+ +----+ +----+                   |
|  | .. | | .. | | .. | | .. | | .. | | .. |                   |
|  +----+ +----+ +----+ +----+ +----+ +----+                   |
+--------------------------------------------------------------+
```

---

## WATCH (`/tonton/:type/:id`)

```
+--------------------------------------------------------------+
| LAYAR   [Beranda] [Film] [Series]      [Cari...        ] [=] |
+--------------------------------------------------------------+
|  <- Kembali ke detail                                        |
|                                                              |
|  +--------------------------------------------------------+  |
|  |                                                        |  |
|  |                 PLAYER (16:9)                           |  |
|  |   ArtPlayer (HLS) untuk self-host;                     |  |
|  |   iframe generik untuk embed pihak ketiga.             |  |
|  |                                                        |  |
|  +--------------------------------------------------------+  |
|                                                              |
|  Judul · S1 E3 "Judul Episode"                               |
|  Sumber: [Self-hosted v]  <- dropdown jika >1 provider       |
|                                                              |
|  Episode: [01] [02] [03] [04] ..                             |
|                                                              |
|  Tonton di platform legal: [Netflix] [Disney+] ..            |
+--------------------------------------------------------------+
```

---

## Catatan

- Semua halaman pakai **top bar solid** (bukan navbar transparan yang berubah saat scroll).
- **Eyebrow/kicker** selalu `NO. xxxxx · LABEL` (mono, kecil, uppercase).
- **Strip arsip** untuk navigasi row di Home; **grid** untuk Browse; **daftar episode** untuk Detail/Watch.
- **Nomor katalog** muncul di hero, kartu, dan detail — konsisten di semua halaman.
- Tidak ada panah bulat di row; navigasi pakai nomor urut `[01] [02] ..` yang bisa diklik.
