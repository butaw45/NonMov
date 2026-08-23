import { describe, it, expect } from 'vitest'
import {
  cx,
  titleOf,
  yearOf,
  mediaTypeOf,
  keyOf,
  ratingOf,
  runtimeLabel,
  catalogNo,
} from '../../src/lib/utils.js'

describe('cx', () => {
  it('joins truthy values with space', () => {
    expect(cx('a', 'b', 'c')).toBe('a b c')
  })

  it('filters falsy values', () => {
    expect(cx('a', null, 'b', undefined, '', false, 'c')).toBe('a b c')
  })

  it('returns empty string for all falsy', () => {
    expect(cx(null, undefined, false, '')).toBe('')
  })

  it('returns empty string for no args', () => {
    expect(cx()).toBe('')
  })
})

describe('titleOf', () => {
  it('returns item.title when present', () => {
    expect(titleOf({ title: 'Inception', name: 'Inception (alt)' })).toBe('Inception')
  })

  it('falls back to item.name', () => {
    expect(titleOf({ name: 'Breaking Bad' })).toBe('Breaking Bad')
  })

  it('falls back to original_title', () => {
    expect(titleOf({ original_title: 'レッドリスト' })).toBe('レッドリスト')
  })

  it('falls back to original_name', () => {
    expect(titleOf({ original_name: 'El Camino' })).toBe('El Camino')
  })

  it('returns Tanpa judul when nothing present', () => {
    expect(titleOf({})).toBe('Tanpa judul')
  })
})

describe('yearOf', () => {
  it('extracts year from release_date', () => {
    expect(yearOf({ release_date: '2010-07-16' })).toBe('2010')
  })

  it('extracts year from first_air_date', () => {
    expect(yearOf({ first_air_date: '2008-01-20' })).toBe('2008')
  })

  it('prefers release_date over first_air_date', () => {
    expect(yearOf({ release_date: '2020-01-01', first_air_date: '2019-01-01' })).toBe('2020')
  })

  it('returns empty string when both dates missing', () => {
    expect(yearOf({})).toBe('')
  })
})

describe('mediaTypeOf', () => {
  it('returns explicit media_type', () => {
    expect(mediaTypeOf({ media_type: 'movie' })).toBe('movie')
    expect(mediaTypeOf({ media_type: 'tv' })).toBe('tv')
  })

  it('falls back to type field', () => {
    expect(mediaTypeOf({ type: 'movie' })).toBe('movie')
    expect(mediaTypeOf({ type: 'tv' })).toBe('tv')
  })

  it('heuristic: name without title → tv', () => {
    expect(mediaTypeOf({ name: 'Stranger Things' })).toBe('tv')
  })

  it('heuristic: title present → movie', () => {
    expect(mediaTypeOf({ title: 'The Matrix' })).toBe('movie')
    expect(mediaTypeOf({ title: 'Up', name: 'Up (alt)' })).toBe('movie')
  })

  it('defaults to movie when neither title nor name', () => {
    expect(mediaTypeOf({ id: 1 })).toBe('movie')
  })
})

describe('keyOf', () => {
  it('returns type:id string', () => {
    expect(keyOf({ id: 550, media_type: 'movie' })).toBe('movie:550')
  })

  it('uses mediaTypeOf for type resolution', () => {
    expect(keyOf({ id: 1399, name: 'Game of Thrones' })).toBe('tv:1399')
  })
})

describe('ratingOf', () => {
  it('formats positive vote_average to 1 decimal', () => {
    expect(ratingOf({ vote_average: 8.456 })).toBe('8.5')
  })

  it('returns null for zero vote_average', () => {
    expect(ratingOf({ vote_average: 0 })).toBe(null)
  })

  it('returns null for missing vote_average', () => {
    expect(ratingOf({})).toBe(null)
  })
})

describe('runtimeLabel', () => {
  it('formats hours and minutes', () => {
    expect(runtimeLabel(142)).toBe('2 j 22 mnt')
  })

  it('formats minutes only when less than 60', () => {
    expect(runtimeLabel(45)).toBe('45 mnt')
  })

  it('returns null for zero', () => {
    expect(runtimeLabel(0)).toBe(null)
  })

  it('returns null for null/undefined', () => {
    expect(runtimeLabel(null)).toBe(null)
    expect(runtimeLabel(undefined)).toBe(null)
  })

  it('rounds down minutes part', () => {
    expect(runtimeLabel(90)).toBe('1 j 30 mnt')
    expect(runtimeLabel(60)).toBe('1 j 0 mnt')
  })
})

describe('catalogNo', () => {
  it('pads id to 5 digits', () => {
    expect(catalogNo(42)).toBe('NO. 00042')
  })

  it('handles already-long ids', () => {
    expect(catalogNo(123456)).toBe('NO. 123456')
  })

  it('handles string ids', () => {
    expect(catalogNo('7')).toBe('NO. 00007')
  })

  it('handles zero', () => {
    expect(catalogNo(0)).toBe('NO. 00000')
  })
})