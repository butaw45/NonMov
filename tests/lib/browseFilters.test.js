import { describe, it, expect } from 'vitest'
import { COUNTRIES, DEBOUNCE_MS, ratingParam } from '../../src/lib/browseFilters.js'

describe('COUNTRIES', () => {
  it('has 11 countries', () => {
    expect(COUNTRIES).toHaveLength(11)
  })

  it('includes Indonesia first', () => {
    expect(COUNTRIES[0]).toEqual({ code: 'ID', name: 'Indonesia' })
  })

  it('each entry has code and name', () => {
    for (const c of COUNTRIES) {
      expect(typeof c.code).toBe('string')
      expect(c.code).toHaveLength(2)
      expect(typeof c.name).toBe('string')
      expect(c.name.length).toBeGreaterThan(0)
    }
  })
})

describe('DEBOUNCE_MS', () => {
  it('is 300', () => {
    expect(DEBOUNCE_MS).toBe(300)
  })
})

describe('ratingParam', () => {
  it('returns {gte, countGte} for valid min', () => {
    const result = ratingParam(7.5)
    expect(result).toEqual({ gte: 7.5, countGte: 100 })
  })

  it('uses existingCountGte when higher than default', () => {
    const result = ratingParam(7, 200)
    expect(result).toEqual({ gte: 7, countGte: 200 })
  })

  it('caps countGte at minimum 100 when existingCountGte is lower', () => {
    const result = ratingParam(7, 30)
    expect(result).toEqual({ gte: 7, countGte: 100 })
  })

  it('returns null when min is 0', () => {
    expect(ratingParam(0)).toBe(null)
  })

  it('returns null when min is negative', () => {
    expect(ratingParam(-1)).toBe(null)
  })

  it('returns null when min is NaN', () => {
    expect(ratingParam(NaN)).toBe(null)
  })

  it('returns null when min is not finite', () => {
    expect(ratingParam(Infinity)).toBe(null)
    expect(ratingParam(-Infinity)).toBe(null)
  })

  it('returns null when min is null/undefined', () => {
    expect(ratingParam(null)).toBe(null)
    expect(ratingParam(undefined)).toBe(null)
  })

  it('returns null when min is not a number', () => {
    expect(ratingParam('abc')).toBe(null)
  })

  it('handles integer min', () => {
    const result = ratingParam(5)
    expect(result).toEqual({ gte: 5, countGte: 100 })
  })
})