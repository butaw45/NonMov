# Test Suite Architecture — Seluloid (LAYAR)

> **Ringkasan:** Test suite untuk frontend React 19 + Vite 8 + backend Express. Fokus pada pure functions, integrasi API dengan mock fetch, dan smoke test untuk komponen. Bukan mengejar coverage 100%, tapi defensive net untuk regresi.

## Stack

| Lapisan | Alat | Alasan |
|---------|------|--------|
| **Test runner** | Vitest ^3.x | Vite-native, kompatibel dengan Vite 8 (Rolldown), konfigurasi bareng di `vite.config.js`, cepat |
| **React component/hooks** | @testing-library/react ^16 | Ringan, fokus ke behavior DOM bukan implementation detail |
| **React test utils** | jsdom | Built-in Vitest environment, tanpa browser |
| **Backend integration** | supertest ^7 | Express native; bisa test route langsung tanpa HTTP server |
| **Fake timers** | vitest `vi.useFakeTimers` | Built-in; untuk `useDebounce`, `history.js` timestamp |
| **E2E smoke** | playwright-cli | Sudah ada; untuk scenario happy path (opsional P2) |

### Dependencies baru (`devDependencies` di root `package.json`)

- `vitest` ^3.x
- `@testing-library/react` ^16
- `@testing-library/jest-dom` ^6
- `@testing-library/user-event` ^14
- `supertest` ^7 (untuk backend test)
- `jsdom` ^25 (Vitest environment, mungkin sudah include)

## Struktur Direktori

```
tests/
├── lib/                # Unit test — pure functions & side-effect libs
│   ├── providers.test.js
│   ├── utils.test.js
│   ├── browseFilters.test.js
│   ├── recommend.test.js
│   ├── hooks.test.js
│   ├── history.test.js
│   └── watchlist.test.js
├── api/                # Integration test — TMDB & admin API clients
│   ├── tmdb.test.js
│   └── api.test.js
├── components/         # Smoke test — presentational components
│   ├── Kicker.test.jsx
│   ├── Logo.test.jsx
│   ├── PosterCard.test.jsx
│   └── Row.test.jsx
├── server/             # Backend integration — Express routes
│   ├── admin.test.js
│   ├── adminRoutes.test.js
│   └── catalog.test.js
├── e2e/                # E2E smoke (playwright-cli, opsional)
│   └── smoke-scenarios.md
├── helpers/            # Shared mock factories
│   ├── tmdb-fixtures.js
│   ├── mock-fetch.js
│   └── test-store.js
├── vitest.setup.js     # Setup: cleanup, custom matchers, env
└── vitest.config.js    # (opsional; bisa inline di vite.config.js)
```

## Layer Testing & Strategi Mock

### Layer 1: Pure Functions (prioritas tertinggi)

**Kenapa duluan:** tanpa mock, tanpa setup, test murni. Deteksi regresi tertinggi dengan effort terendah.

| Module | Fungsi utama | Strategi |
|--------|-------------|----------|
| `src/lib/providers.js` | `buildEmbedUrl`, `normalizeProvider`, `entryProviders`, `flatToProviders`, `resolveProviders` | Pure function; passing data langsung |
| `src/lib/utils.js` | `cx`, `titleOf`, `yearOf`, `mediaTypeOf`, `keyOf`, `ratingOf`, `runtimeLabel`, `catalogNo` | Pure function |
| `src/lib/browseFilters.js` | `ratingParam` | Pure function |
| `src/lib/recommend.js` | `collectSeeds`, `scoreRecommendations` | Pure function (arg array of objects) |

### Layer 2: Side-effect Libraries (mock ringan)

| Module | Fungsi | Strategi Mock |
|--------|--------|---------------|
| `src/lib/history.js` | `upsertProgress`, `removeHistory`, `restorePosition` | jsdom `localStorage` built-in; reset per test |
| `src/lib/watchlist.js` | `toggleWatch`, `clearWatchlist`, `pushRecentSearch` | jsdom `localStorage` built-in; reset per test |
| `src/lib/hooks.js` | `useDebounce`, `useTitle` | `@testing-library/react` `renderHook` + fake timers |

### Layer 3: API Clients (fetch stub)

| Module | Strategi Mock |
|--------|---------------|
| `src/lib/tmdb.js` | `vi.stubGlobal('fetch', mockFetch)` — fixture JSON dari file `helpers/tmdb-fixtures.js` |
| `src/lib/api.js` | Sama; bisa bedakan response via URL matcher |

**Fixture JSON real** — ambil sample dari TMDB response asli (trending, detail movie, detail tv, season dll) disimpan di `tests/helpers/`. Beratnya: ~15-30 KB total.

### Layer 4: Backend Express

| Module | Strategi |
|--------|----------|
| `server/admin.js` | Import langsung; panggil fungsi CRUD; test pake store temporer `.test.json` |
| `server/adminRoutes.js` | `supertest(app)` — Express app tanpa HTTP server bind |
| `server/index.js` | `supertest(app)` — test proxy endpoint + catalog API |

Perlu refactor: `server/index.js` harus export `app` selain `app.listen()` agar supertest bisa pakai tanpa bind port.

### Layer 5: Komponen Presentasional (smoke test)

| Component | Strategi |
|-----------|----------|
| `Kicker`, `Logo`, `PosterCard` | RTL render + assert element muncul dengan props minimal |
| `Row` (loading state + data state) | RTL render + assert item list |

**TIDAK** test page-level komponen (`Home`, `Browse`, `Detail`, `Watch`) — itu butuh banyak mock TMDB + routing + localStorage state. Bisa ditambah setelah foundation kuat.

## Environment & Setup

### `vitest.setup.js`
```js
import '@testing-library/jest-dom'

beforeEach(() => {
  localStorage.clear()
})
```

### `vite.config.js` tambahan
```js
/// <reference types="vitest" />
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/vitest.setup.js'],
    globals: true,
    include: ['tests/**/*.test.{js,jsx}'],
  },
  // ... existing server, build config ...
})
```

### `package.json` script tambahan
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Prioritas Implementasi

### Batch 1 (foundation) — estimasi 1-2 jam
1. Install dependencies (`vitest`, `@testing-library/*`, `supertest`, `jsdom`)
2. Setup `vite.config.js` test config + `vitest.setup.js`
3. Buat `tests/helpers/` fixtures
4. Test semua pure functions (providers, utils, browseFilters, recommend)

### Batch 2 (side-effect) — estimasi 1 jam
5. Test hooks (useDebounce, useTitle)
6. Test history (localStorage)
7. Test watchlist (localStorage)

### Batch 3 (API) — estimasi 1.5 jam
8. Test TMDB client (fetch stub)
9. Test admin API client (fetch stub)

### Batch 4 (backend) — estimasi 1.5 jam
10. Refactor server/index.js export app
11. Test admin.js CRUD
12. Test adminRoutes.js (supertest)
13. Test catalog API (supertest)

### Batch 5 (komponen) — estimasi 1 jam
14. Test Kicker, Logo, PosterCard
15. Test Row (loading + populated)

## Non-Goals
- **TIDAK** test page-level komponen (Home, Browse, Detail, Watch) — reliance on state + routing + TMDB data terlalu tinggi
- **TIDAK** test server/index.js proxy endpoint real TMDB — itu test integrasi eksternal
- **TIDAK** E2E playwright test otomatis di CI sekarang — manual smoke sudah cukup
- **TIDAK** coverage threshold (tapi kita monitor)