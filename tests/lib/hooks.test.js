import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce, useTitle } from '../../src/lib/hooks'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello'))
    expect(result.current).toBe('hello')
  })

  it('updates after delay when value changes', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 400), {
      initialProps: { val: 'a' },
    })
    expect(result.current).toBe('a')

    rerender({ val: 'b' })
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(400))
    expect(result.current).toBe('b')
  })

  it('clears previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 400), {
      initialProps: { val: 'a' },
    })
    rerender({ val: 'b' })
    rerender({ val: 'c' })

    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('c')
  })

  it('uses default 400ms delay when none given', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val), {
      initialProps: { val: 'x' },
    })
    rerender({ val: 'y' })
    act(() => vi.advanceTimersByTime(399))
    expect(result.current).toBe('x')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('y')
  })
})

describe('useTitle', () => {
  afterEach(() => {
    document.title = ''
  })

  it('sets title with suffix when title is given', () => {
    renderHook(() => useTitle('Home'))
    expect(document.title).toBe('Home · LAYAR')
  })

  it('sets fallback title when title is falsy', () => {
    renderHook(() => useTitle(''))
    expect(document.title).toBe('LAYAR — Arsip Film & Series')
  })

  it('sets fallback when title is null', () => {
    renderHook(() => useTitle(null))
    expect(document.title).toBe('LAYAR — Arsip Film & Series')
  })

  it('updates title on rerender', () => {
    const { rerender } = renderHook(({ t }) => useTitle(t), { initialProps: { t: 'Film' } })
    expect(document.title).toBe('Film · LAYAR')

    rerender({ t: 'Series' })
    expect(document.title).toBe('Series · LAYAR')
  })
})