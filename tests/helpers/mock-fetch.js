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