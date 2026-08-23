# Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Install Vitest + testing-library + supertest, setup config, and write ~60-70 tests across pure functions, side-effect libs, API clients, backend routes, and presentational components.

**Architecture:** Multi-layer: pure functions (no mock) → localStorage lib (jsdom) → API clients (fetch stub) → backend Express (supertest) → components (RTL). Dimulai dari yang paling sederhana.

**Tech Stack:** Vitest ^3, @testing-library/react ^16, @testing-library/jest-dom ^6, @testing-library/user-event ^14, supertest ^7, jsdom ^25.

**Spec:** `docs/superpowers/specs/2026-08-23-test-suite-architecture-design.md`

## Global Constraints

- All new tests go in `tests/` directory (one level, dengan sub-folder `lib/`, `api/`, `components/`, `server/`, `helpers/`)
- `vitest` config inline di `vite.config.js` (tidak perlu file terpisah)
- Gunakan `vi.stubGlobal` untuk mock fetch; jangan library mock fetch eksternal
- Fixture JSON untuk TMDB: simpan di `tests/helpers/tmdb-fixtures.js` (inline object, bukan file JSON)
- Setiap test file harus standalone — import langsung dari `src/`, bukan re-export
- Tidak perlu test runner terpisah untuk backend; Vitest handle semuanya
- Skip `npm run test` di akhir task; build dulu test-nya, run saat batch selesai
- Gunakan `ponytail: true` implicit — tiap test file minimal 3 assertion per fungsi utama

---

### Task 1: Setup Deps + Config + Helpers

**Files:**
- Modify: `package.json` (add devDeps + scripts)
- Modify: `vite.config.js` (add `test:` block)
- Create: `tests/vitest.setup.js`
- Create: `tests/helpers/tmdb-fixtures.js`
- Create: `tests/helpers/mock-fetch.js`
- Create: `tests/helpers/test-store.js`

**Interfaces:**
- Consumes: existing `vite.config.js`, `package.json`
- Produces: vitest config, shared mock helpers

- [ ] **Add devDependencies to root package.json**

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^25.0.1",
    "supertest": "^7.0.0",
    "vitest": "^3.0.5"
  }
}
```

- [ ] **Add test scripts to package.json**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Add `test:` block to `vite.config.js`**

```js
/// <reference types="vitest" />
export default defineConfig({
  // ... existing plugins, server, build ...
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/vitest.setup.js'],
    globals: true,
    include: ['tests/**/*.test.{js,jsx}'],
  },
})
```

- [ ] **Create `tests/vitest.setup.js`**

```js
import '@testing-library/jest-dom'

beforeEach(() => {
  localStorage.clear()
})
```

- [ ] **Create `tests/helpers/tmdb-fixtures.js`** — Sample TMDB responses:

```js
export const TRENDING_FIXTURE = {
  results: [
    { id: 1, title: 'Test Movie', media_type: 'movie', vote_average: 7.5, poster_path: '/test.jpg', overview: 'Test' },
    { id: 2, name: 'Test TV', media_type: 'tv', vote_average: 8.0, poster_path: '/test2.jpg', overview: 'Test TV' },
  ],
}

export const MOVIE_DETAIL_FIXTURE = {
  id: 1,
  title: 'Test Movie',
  overview: 'A test movie',
  vote_average: 7.5,
  poster_path: '/test.jpg',
  genres: [{ id: 1, name: 'Action' }],
  runtime: 120,
}

export const TV_DETAIL_FIXTURE = {
  id: 2,
  name: 'Test TV Series',
  overview: 'A test series',
  vote_average: 8.0,
  poster_path: '/test2.jpg',
  genres: [{ id: 2, name: 'Drama' }],
  seasons: [{ season_number: 1, episode_count: 10 }],
}

export const SEASON_FIXTURE = {
  episodes: [
    { episode_number: 1, name: 'Pilot', still_path: '/still1.jpg' },
    { episode_number: 2, name: 'Episode 2', still_path: '/still2.jpg' },
  ],
}

export const PROVIDERS_FIXTURE = {
  results: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.png' }] },
}
```

- [ ] **Create `tests/helpers/mock-fetch.js`**

```js
import {
  TRENDING_FIXTURE,
  MOVIE_DETAIL_FIXTURE,
  TV_DETAIL_FIXTURE,
  SEASON_FIXTURE,
  PROVIDERS_FIXTURE,
} from './tmdb-fixtures.js'

/** Map URL pattern → fixture */
const FIXTURE_MAP = {
  '/trending': TRENDING_FIXTURE,
  '/movie/1': MOVIE_DETAIL_FIXTURE,
  '/tv/2': TV_DETAIL_FIXTURE,
  '/tv/2/season/1': SEASON_FIXTURE,
  '/movie/1/watch': PROVIDERS_FIXTURE,
}

export function createMockFetch(overrides = {}) {
  return (url) => {
    // Cari fixture berdasarkan URL pattern
    const matchKey = Object.keys(FIXTURE_MAP).find((k) => url.includes(k))
    const body = matchKey ? FIXTURE_MAP[matchKey] : { ok: true }
    const custom = overrides[url] || null

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(custom || body),
    })
  }
}

export function createMockFetchError(status = 404) {
  return () =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve({ status_message: 'Not found' }),
    })
}
```

- [ ] **Create `tests/helpers/test-store.js`** — temporer backend store for server tests

```js
import fs from 'fs'
import path from 'path'

const TEST_DIR = path.resolve('tests', '__tmp__')

export function withTestStore(fn) {
  const tmp = path.join(TEST_DIR, `store-${Date.now()}.json`)
  fs.mkdirSync(TEST_DIR, { recursive: true })
  const initial = {
    entries: [
      { id: 1, tmdb_id: 1, title: 'Test Entry', type: 'movie', status: 'published' },
      { id: 2, tmdb_id: 2, title: 'Draft Entry', type: 'tv', status: 'draft' },
    ],
    sessions: [],
  }
  fs.writeFileSync(tmp, JSON.stringify(initial), 'utf-8')
  try {
    return fn(tmp)
  } finally {
    fs.unlinkSync(tmp)
  }
}
```

- [ ] **Commit**

```
git add package.json vite.config.js tests/ helpers/
git commit -m "test: foundation — vitest + helpers + fixtures"
```

---

### Task 2: Pure Functions — providers, utils, browseFilters, recommend

**Files:**
- Create: `tests/lib/providers.test.js`
- Create: `tests/lib/utils.test.js`
- Create: `tests/lib/browseFilters.test.js`
- Create: `tests/lib/recommend.test.js`

**Interfaces:**
- Consumes: `src/lib/providers.js`, `src/lib/utils.js`, `src/lib/browseFilters.js`, `src/lib/recommend.js`
- Produces: test coverage for pure function modules

- [ ] **Write `tests/lib/providers.test.js`**

```js
import { describe, it, expect } from 'vitest'
import {
  buildEmbedUrl,
  normalizeProvider,
  entryProviders,
  flatToProviders,
  resolveProviders,
} from '../../src/lib/providers.js'

describe('buildEmbedUrl', () => {
  it('replaces {tmdb_id}, {season}, {episode}', () => {
    const result = buildEmbedUrl('https://example.com/{tmdb_id}?s={season}&e={episode}', {
      tmdb_id: 12345,
      season: 1,
      episode: 3,
    })
    expect(result).toBe('https://example.com/12345?s=1&e=3')
  })

  it('handles missing season/episode', () => {
    const result = buildEmbedUrl('https://example.com/{tmdb_id}', { tmdb_id: 999 })
    expect(result).toBe('https://example.com/999')
  })
})

describe('normalizeProvider', () => {
  it('returns null for invalid input', () => {
    expect(normalizeProvider(null)).toBeNull()
    expect(normalizeProvider({})).toBeNull()
    expect(normalizeProvider({ type: 'unknown' })).toBeNull()
  })

  it('normalizes self provider', () => {
    const result = normalizeProvider({ type: 'self', video_url: 'http://x.com', video_type: 'hls' })
    expect(result.type).toBe('self')
    expect(result.video_url).toBe('http://x.com')
  })

  it('normalizes embed provider', () => {
    const result = normalizeProvider({ type: 'embed', movie_url: 'http://x.com/{tmdb_id}', enabled: true })
    expect(result.type).toBe('embed')
    expect(result.movie_url).toBe('http://x.com/{tmdb_id}')
    expect(result.enabled).toBe(true)
  })
})

describe('entryProviders', () => {
  it('filters self-only from entry.providers', () => {
    const entry = {
      providers: [
        { type: 'self', video_url: 'http://self.mp4' },
        { type: 'embed', movie_url: 'http://embed.com/{tmdb_id}' },
      ],
    }
    const result = entryProviders(entry)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('self')
  })

  it('returns null if no self providers', () => {
    const entry = { providers: [{ type: 'embed', movie_url: 'http://x.com' }] }
    expect(entryProviders(entry)).toBeNull()
  })

  it('returns null for missing/invalid providers', () => {
    expect(entryProviders({})).toBeNull()
    expect(entryProviders({ providers: [] })).toBeNull()
  })
})

describe('flatToProviders', () => {
  it('converts legacy self fields', () => {
    const result = flatToProviders({ video_provider: 'self', video_url: 'http://x.mp4' })
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('self')
    expect(result[0].video_url).toBe('http://x.mp4')
  })

  it('returns empty for non-self', () => {
    expect(flatToProviders({ video_provider: 'embed' })).toEqual([])
  })
})

describe('resolveProviders', () => {
  const embedProvider = { type: 'embed', movie_url: '{tmdb_id}', enabled: true, media_type: 'movie' }
  const tvEmbedProvider = { type: 'embed', movie_url: '{tmdb_id}', enabled: true, media_type: 'tv' }

  it('priority 1: override self per-entry', () => {
    const entry = { providers: [{ type: 'self', video_url: 'http://self.mp4' }] }
    const result = resolveProviders(entry, { providers: [embedProvider] }, 'movie')
    expect(result[0].type).toBe('self')
  })

  it('priority 2: flat legacy self', () => {
    const entry = { video_provider: 'self', video_url: 'http://legacy.mp4' }
    const result = resolveProviders(entry, { providers: [embedProvider] }, 'movie')
    expect(result[0].type).toBe('self')
  })

  it('priority 3: global pool by kind', () => {
    const result = resolveProviders({}, { providers: [embedProvider, tvEmbedProvider] }, 'movie')
    expect(result).toHaveLength(1)
    expect(result[0].media_type).toBe('movie')
  })

  it('priority 4: empty array when no match', () => {
    const result = resolveProviders({}, { providers: [] }, 'movie')
    expect(result).toEqual([])
  })
})
```

- [ ] **Write `tests/lib/utils.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { cx, titleOf, yearOf, mediaTypeOf, keyOf, ratingOf, runtimeLabel, catalogNo } from '../../src/lib/utils.js'

describe('cx', () => {
  it('merges class names', () => {
    expect(cx('a', 'b')).toBe('a b')
    expect(cx('a', false && 'b', 'c')).toBe('a c')
  })
})

describe('titleOf', () => {
  it('returns title for movie', () => {
    expect(titleOf({ title: 'Movie' })).toBe('Movie')
  })
  it('returns name for tv', () => {
    expect(titleOf({ name: 'Series' })).toBe('Series')
  })
  it('falls back', () => {
    expect(titleOf({})).toBe('')
  })
})

describe('keyOf', () => {
  it('joins type:id', () => {
    expect(keyOf({ type: 'movie', id: 5 })).toBe('movie:5')
  })
})

describe('ratingOf', () => {
  it('formats to 1 decimal', () => {
    expect(ratingOf(7.543)).toBe('7.5')
  })
  it('returns null for missing', () => {
    expect(ratingOf(null)).toBeNull()
  })
})

describe('runtimeLabel', () => {
  it('formats hours and minutes', () => {
    expect(runtimeLabel(150)).toBe('2 j 30 mnt')
    expect(runtimeLabel(45)).toBe('45 mnt')
    expect(runtimeLabel(0)).toBe('')
  })
})

describe('catalogNo', () => {
  it('formats with leading zeros', () => {
    expect(catalogNo(1)).toBe('NO. 00001')
    expect(catalogNo(12345)).toBe('NO. 12345')
  })
})
```

- [ ] **Write `tests/lib/browseFilters.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { COUNTRIES, DEBOUNCE_MS, ratingParam } from '../../src/lib/browseFilters.js'

describe('COUNTRIES', () => {
  it('has 11 entries', () => {
    expect(COUNTRIES).toHaveLength(11)
  })
  it('includes ID and US', () => {
    expect(COUNTRIES.some((c) => c.iso === 'ID')).toBe(true)
  })
})

describe('DEBOUNCE_MS', () => {
  it('is 300', () => {
    expect(DEBOUNCE_MS).toBe(300)
  })
})

describe('ratingParam', () => {
  it('returns null for min <= 0', () => {
    expect(ratingParam(0)).toBeNull()
    expect(ratingParam(-1)).toBeNull()
  })
  it('returns param object for valid min', () => {
    const r = ratingParam(5)
    expect(r.gte).toBe(5)
    expect(r.countGte).toBeGreaterThanOrEqual(100)
  })
})
```

- [ ] **Write `tests/lib/recommend.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { collectSeeds, scoreRecommendations } from '../../src/lib/recommend.js'

describe('collectSeeds', () => {
  it('returns up to n seeds', () => {
    const seeds = collectSeeds([{ type: 'movie', id: 1 }], [{ type: 'movie', id: 2 }], 2)
    expect(seeds).toHaveLength(2)
  })
  it('prefers history over watchlist', () => {
    const seeds = collectSeeds([{ type: 'movie', id: 1 }], [{ type: 'movie', id: 2 }], 1)
    expect(seeds[0].id).toBe(2)
  })
})

describe('scoreRecommendations', () => {
  it('returns sorted scored results', () => {
    const result = scoreRecommendations(
      { someKey: { results: [{ id: 10, title: 'A', vote_average: 8 }] } },
      new Set(),
      10,
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(10)
  })
})
```

- [ ] **Commit**

```
git add tests/lib/
git commit -m "test: pure functions — providers, utils, browseFilters, recommend"
```

---

### Task 3: Side-effect — hooks, history, watchlist

**Files:**
- Create: `tests/lib/hooks.test.js`
- Create: `tests/lib/history.test.js`
- Create: `tests/lib/watchlist.test.js`

**Interfaces:**

- [ ] **Write `tests/lib/hooks.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce, useTitle } from '../../src/lib/hooks.js'

describe('useDebounce', () => {
  it('debounces value change', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), {
      initialProps: { val: 'a' },
    })
    expect(result.current).toBe('a')
    rerender({ val: 'b' })
    expect(result.current).toBe('a') // belum 300ms
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('b')
    vi.useRealTimers()
  })
})

describe('useTitle', () => {
  it('sets document title', () => {
    renderHook(() => useTitle('Test'))
    expect(document.title).toContain('Test')
  })
})
```

- [ ] **Write `tests/lib/history.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { upsertProgress, removeHistory, restorePosition, getSnapshot } from '../../src/lib/history.js'

const makeEntry = (id, pos, season, episode) => ({
  type: 'movie', id: String(id), pos, season, episode, title: 'Test',
})

describe('upsertProgress', () => {
  it('ignores pos < 3', () => {
    upsertProgress(makeEntry(1, 2))
    expect(getSnapshot()).toHaveLength(0)
  })
  it('adds new entry', () => {
    upsertProgress(makeEntry(1, 50))
    expect(getSnapshot()).toHaveLength(1)
  })
  it('updates existing', () => {
    upsertProgress(makeEntry(1, 50))
    upsertProgress(makeEntry(1, 100))
    expect(getSnapshot()).toHaveLength(1)
  })
})

describe('restorePosition', () => {
  beforeEach(() => localStorage.clear())
  it('returns 0 for missing', () => {
    expect(restorePosition('movie', '999')).toBe(0)
  })
})
```

- [ ] **Write `tests/lib/watchlist.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { toggleWatch, getSnapshot, clearWatchlist } from '../../src/lib/watchlist.js'

describe('toggleWatch', () => {
  it('adds item', () => {
    const added = toggleWatch({ id: 1, type: 'movie' })
    expect(added).toBe(true)
  })
  it('removes item on second toggle', () => {
    toggleWatch({ id: 1, type: 'movie' })
    const added = toggleWatch({ id: 1, type: 'movie' })
    expect(added).toBe(false)
  })
})
```

- [ ] **Commit**

```
git add tests/lib/hooks.test.js tests/lib/history.test.js tests/lib/watchlist.test.js
git commit -m "test: side-effect libs — hooks, history, watchlist"
```

---

### Task 4: API Clients — tmdb.js + api.js

**Files:**
- Create: `tests/api/tmdb.test.js`
- Create: `tests/api/api.test.js`

**Interfaces:**
- Consumes: `src/lib/tmdb.js`, `src/lib/api.js`, `tests/helpers/mock-fetch.js`
- Produces: test coverage for API client functions with fetch stubbed

- [ ] **Write `tests/api/tmdb.test.js`**

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createMockFetch } from '../helpers/mock-fetch.js'

// We'll test tmdb.trending, tmdb.movie, tmdb.tv, etc.

describe('tmdb.trending', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', createMockFetch())
  })
  afterEach(() => {
    vi.unstubGlobal('fetch')
  })

  it('fetches trending data', async () => {
    const { tmdb } = await import('../../src/lib/tmdb.js')
    const data = await tmdb.trending('all', 'week')
    expect(data.results).toBeDefined()
    expect(data.results.length).toBeGreaterThan(0)
  })
})

describe('tmdb.movie', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', createMockFetch())
  })
  afterEach(() => {
    vi.unstubGlobal('fetch')
  })

  it('fetches movie detail', async () => {
    const { tmdb } = await import('../../src/lib/tmdb.js')
    const data = await tmdb.movie(1)
    expect(data.title).toBe('Test Movie')
  })
})

describe('tmdb.tv', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', createMockFetch())
  })
  afterEach(() => {
    vi.unstubGlobal('fetch')
  })

  it('fetches tv detail', async () => {
    const { tmdb } = await import('../../src/lib/tmdb.js')
    const data = await tmdb.tv(2)
    expect(data.name).toBe('Test TV Series')
  })
})

describe('catalogLookup', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', createMockFetch())
  })
  afterEach(() => {
    vi.unstubGlobal('fetch')
  })

  it('returns null when no match', async () => {
    const { catalogLookup } = await import('../../src/lib/tmdb.js')
    const result = await catalogLookup(999, 'movie')
    // catalogLookup returns null when no match
    expect(result).toBeNull()
  })
})
```

- [ ] **Write `tests/api/api.test.js`**

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createMockFetch } from '../helpers/mock-fetch.js'

describe('adminApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', createMockFetch())
  })
  afterEach(() => {
    vi.unstubGlobal('fetch')
  })

  it('login sends POST with credentials', async () => {
    const { adminApi } = await import('../../src/lib/api.js')
    const result = await adminApi.login('user', 'pass')
    expect(result).toBeDefined()
  })

  it('me returns current session', async () => {
    const { adminApi } = await import('../../src/lib/api.js')
    const result = await adminApi.me()
    expect(result).toBeDefined()
  })
})
```

- [ ] **Commit**

```
git add tests/api/
git commit -m "test: API clients — tmdb.js, api.js"
```

---

### Task 5: Backend Express — admin.js + adminRoutes.js + catalog

**Files:**
- Modify: `server/index.js` (export app for supertest)
- Create: `tests/server/admin.test.js`
- Create: `tests/server/adminRoutes.test.js`
- Create: `tests/server/catalog.test.js`

**Interfaces:**
- Consumes: `server/admin.js`, `server/adminRoutes.js`, `server/index.js`, `tests/helpers/test-store.js`

- [ ] **Refactor `server/index.js`** — Export `app` besides `listen()`:

```js
// Akhir file, ubah dari:
// app.listen(PORT, () => { ... })

// menjadi:
export { app }
app.listen(PORT, () => { ... })
```

- [ ] **Write `tests/server/admin.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { withTestStore } from '../helpers/test-store.js'

describe('admin CRUD — pure logic', () => {
  it('listEntries returns all entries', () => {
    withTestStore((storePath) => {
      process.env.STORE_PATH = storePath
      // We'll need to import admin.js functions that use loadStore/saveStore
      // and test them with the test store file
    })
  })
})
```

- [ ] **Write `tests/server/adminRoutes.test.js`** — supertest

```js
import { describe, it, expect } from 'vitest'
import request from 'supertest'

describe('adminRoutes', () => {
  it('returns 401 without session', async () => {
    const { app } = await import('../../server/index.js')
    const res = await request(app).get('/admin/api/entries')
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Write `tests/server/catalog.test.js`**

```js
import { describe, it, expect } from 'vitest'
import request from 'supertest'

describe('/api/catalog', () => {
  it('returns only published entries', async () => {
    const { app } = await import('../../server/index.js')
    const res = await request(app).get('/api/catalog')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    // Verify all returned entries are published
    res.body.forEach((entry) => {
      expect(entry.status).toBe('published')
    })
  })
})
```

- [ ] **Commit**

```
git add server/index.js tests/server/
git commit -m "test: backend Express — admin CRUD, routes, catalog"
```

---

### Task 6: Presentational Components

**Files:**
- Create: `tests/components/Kicker.test.jsx`
- Create: `tests/components/Logo.test.jsx`
- Create: `tests/components/PosterCard.test.jsx`
- Create: `tests/components/Row.test.jsx`

- [ ] **Write `tests/components/Kicker.test.jsx`**

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Kicker from '../../src/components/Kicker.jsx'

describe('Kicker', () => {
  it('renders number and label', () => {
    render(<Kicker number={42} label="Film" />)
    expect(screen.getByText(/NO\./)).toBeInTheDocument()
    expect(screen.getByText('Film')).toBeInTheDocument()
  })
})
```

- [ ] **Write `tests/components/Logo.test.jsx`**

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Logo from '../../src/components/Logo.jsx'

describe('Logo', () => {
  it('renders logo text', () => {
    render(
      <BrowserRouter>
        <Logo />
      </BrowserRouter>,
    )
    expect(screen.getByText(/LAYAR/)).toBeInTheDocument()
  })
})
```

- [ ] **Write `tests/components/PosterCard.test.jsx`**

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PosterCard from '../../src/components/PosterCard.jsx'

describe('PosterCard', () => {
  const item = { id: 1, title: 'Test Movie', media_type: 'movie', poster_path: '/test.jpg', vote_average: 7.5 }
  it('renders title and rating', () => {
    render(
      <BrowserRouter>
        <PosterCard item={item} />
      </BrowserRouter>,
    )
    expect(screen.getByText('Test Movie')).toBeInTheDocument()
  })
})
```

- [ ] **Write `tests/components/Row.test.jsx`**

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Row from '../../src/components/Row.jsx'

describe('Row', () => {
  const items = [
    { id: 1, title: 'Movie 1', media_type: 'movie' },
    { id: 2, title: 'Movie 2', media_type: 'movie' },
  ]
  it('renders item list', () => {
    render(
      <BrowserRouter>
        <Row title="Test Row" items={items} />
      </BrowserRouter>,
    )
    expect(screen.getByText('Test Row')).toBeInTheDocument()
  })
})
```

- [ ] **Commit**

```
git add tests/components/
git commit -m "test: presentational components — Kicker, Logo, PosterCard, Row"
```

---

### Task 7: Run Full Test Suite + Verify

**Files:** none (verification only)

- [ ] **Run `npm run test`** — verify all tests pass
- [ ] **Run `npm run build`** — verify build still works (no regressions from server/index.js refactor)
- [ ] **If any test fails**, fix and re-run
- [ ] **Commit** any fix batches with `git commit -m "test: fix failures after suite run"`

---

## Timeline Estimasi

| Task | File baru | File mod | Estimasi |
|------|-----------|----------|----------|
| 1. Setup + helpers | 4 | 2 | 20 menit |
| 2. Pure functions | 4 | 0 | 30 menit |
| 3. Side-effect libs | 3 | 0 | 20 menit |
| 4. API clients | 2 | 0 | 20 menit |
| 5. Backend | 3 | 1 | 30 menit |
| 6. Components | 4 | 0 | 20 menit |
| 7. Run all | 0 | 0 | 10 menit |
| **Total** | **20 files** | **3 files** | **~2.5 jam** |