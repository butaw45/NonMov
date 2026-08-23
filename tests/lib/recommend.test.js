import { describe, it, expect } from 'vitest'
import { collectSeeds, scoreRecommendations } from '../../src/lib/recommend.js'

describe('collectSeeds', () => {
  it('collects seeds from history with weight 2', () => {
    const history = [{ id: 1, type: 'movie', title: 'Inception', updatedAt: 100 }]
    const result = collectSeeds([], history, 3)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ type: 'movie', id: 1, title: 'Inception' })
  })

  it('collects seeds from watchlist with weight 1', () => {
    const watchlist = [{ id: 2, type: 'tv', title: 'Breaking Bad', addedAt: 200 }]
    const result = collectSeeds(watchlist, [], 3)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ type: 'tv', id: 2, title: 'Breaking Bad' })
  })

  it('deduplicates by type:id, prefers history over watchlist', () => {
    const history = [{ id: 1, type: 'movie', title: 'Original', updatedAt: 100 }]
    const watchlist = [{ id: 1, type: 'movie', title: 'Original', addedAt: 200 }]
    const result = collectSeeds(watchlist, history, 3)
    // Only one entry for movie:1, from history (already seen first)
    expect(result).toHaveLength(1)
  })

  it('sorts by weight desc then time desc', () => {
    const history = [
      { id: 1, type: 'movie', title: 'A', updatedAt: 100 },
      { id: 2, type: 'movie', title: 'B', updatedAt: 50 },
    ]
    const watchlist = [
      { id: 3, type: 'tv', title: 'C', addedAt: 200 },
    ]
    const result = collectSeeds(watchlist, history, 3)
    // weight 2 (history) first, then weight 1 (watchlist)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(2)
    expect(result[2].id).toBe(3)
  })

  it('skips items with null id', () => {
    const watchlist = [{ id: null, type: 'movie', title: 'Null' }]
    const result = collectSeeds(watchlist, [], 3)
    expect(result).toHaveLength(0)
  })

  it('skips items with undefined id', () => {
    const watchlist = [{ type: 'movie', title: 'No ID' }]
    const result = collectSeeds(watchlist, [], 3)
    expect(result).toHaveLength(0)
  })

  it('skips items without type', () => {
    const watchlist = [{ id: 1, title: 'No Type' }]
    const result = collectSeeds(watchlist, [], 3)
    expect(result).toHaveLength(0)
  })

  it('returns empty array for empty inputs', () => {
    expect(collectSeeds([], [], 3)).toHaveLength(0)
    expect(collectSeeds()).toHaveLength(0)
  })

  it('returns at most n seeds', () => {
    const history = [
      { id: 1, type: 'movie', title: 'A', updatedAt: 100 },
      { id: 2, type: 'tv', title: 'B', updatedAt: 90 },
      { id: 3, type: 'movie', title: 'C', updatedAt: 80 },
      { id: 4, type: 'tv', title: 'D', updatedAt: 70 },
    ]
    expect(collectSeeds([], history, 2)).toHaveLength(2)
  })

  it('diversifies types when enough candidates exist', () => {
    const history = [
      { id: 1, type: 'movie', title: 'A', updatedAt: 100 },
      { id: 2, type: 'movie', title: 'B', updatedAt: 90 },
      { id: 3, type: 'movie', title: 'C', updatedAt: 80 },
      { id: 4, type: 'tv', title: 'D', updatedAt: 70 },
    ]
    const result = collectSeeds([], history, 2)
    // Should have swapped one for type 'tv'
    expect(result.map((s) => s.type).sort()).toEqual(['movie', 'tv'])
  })
})

describe('scoreRecommendations', () => {
  it('scores and deduplicates items across seeds', () => {
    const seedResults = [
      { results: [{ id: 1, media_type: 'movie', poster_path: '/p.jpg', vote_average: 8 }] },
      { results: [{ id: 1, media_type: 'movie', poster_path: '/p.jpg', vote_average: 8 }] },
    ]
    const result = scoreRecommendations(seedResults)
    expect(result).toHaveLength(1)
  })

  it('computes score = 1 + vote_average/10 per seed', () => {
    const seedResults = [
      { results: [{ id: 1, media_type: 'movie', poster_path: '/p.jpg', vote_average: 8 }] },
      { results: [{ id: 1, media_type: 'movie', poster_path: '/p.jpg', vote_average: 8 }] },
    ]
    const result = scoreRecommendations(seedResults)
    // score = 2 * (1 + 8/10) = 3.6
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('skips items without id', () => {
    const seedResults = [{ results: [{ media_type: 'movie', poster_path: '/p.jpg' }] }]
    expect(scoreRecommendations(seedResults)).toHaveLength(0)
  })

  it('skips items without poster_path', () => {
    const seedResults = [{ results: [{ id: 1, media_type: 'movie' }] }]
    expect(scoreRecommendations(seedResults)).toHaveLength(0)
  })

  it('skips items without media_type or type', () => {
    const seedResults = [{ results: [{ id: 1, poster_path: '/p.jpg' }] }]
    expect(scoreRecommendations(seedResults)).toHaveLength(0)
  })

  it('respects excludeKeys', () => {
    const seedResults = [
      { results: [{ id: 1, media_type: 'movie', poster_path: '/p.jpg', vote_average: 7 }] },
    ]
    const exclude = new Set(['movie:1'])
    expect(scoreRecommendations(seedResults, exclude)).toHaveLength(0)
  })

  it('limits results to limit param', () => {
    const results = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      media_type: 'movie',
      poster_path: '/p.jpg',
      vote_average: 5,
    }))
    const seedResults = [{ results }]
    expect(scoreRecommendations(seedResults, new Set(), 10)).toHaveLength(10)
  })

  it('handles empty results', () => {
    expect(scoreRecommendations([])).toHaveLength(0)
  })

  it('handles undefined/empty results arrays', () => {
    expect(scoreRecommendations([{ no_results: true }])).toHaveLength(0)
    expect(scoreRecommendations([{}])).toHaveLength(0)
  })

  it('sorts by score descending', () => {
    const seedResults = [
      {
        results: [
          { id: 1, media_type: 'movie', poster_path: '/a.jpg', vote_average: 9 },
          { id: 2, media_type: 'movie', poster_path: '/b.jpg', vote_average: 5 },
          { id: 3, media_type: 'movie', poster_path: '/c.jpg', vote_average: 7 },
        ],
      },
    ]
    const result = scoreRecommendations(seedResults)
    expect(result.map((r) => r.id)).toEqual([1, 3, 2])
  })
})