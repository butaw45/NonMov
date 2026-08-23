import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PosterCard from '../../src/components/PosterCard.jsx'
import React from 'react'

describe('PosterCard', () => {
  const baseItem = {
    id: 42,
    title: 'Test Film',
    type: 'movie',
    poster_path: '/test.jpg',
    vote_average: 7.5,
    release_date: '2024-01-01',
  }

  it('renders title and year', () => {
    render(
      <BrowserRouter>
        <PosterCard item={baseItem} saved={false} />
      </BrowserRouter>
    )
    // Title appears in .card-title and .card-empty — use getAllByText
    expect(screen.getAllByText('Test Film')).toHaveLength(2)
    expect(screen.getByText('2024 · Film')).toBeInTheDocument()
  })

  it('renders rating when available', () => {
    render(
      <BrowserRouter>
        <PosterCard item={baseItem} saved={false} />
      </BrowserRouter>
    )
    expect(screen.getByText('7.5')).toBeInTheDocument()
  })

  it('links to /judul/movie/:id', () => {
    render(
      <BrowserRouter>
        <PosterCard item={baseItem} saved={false} />
      </BrowserRouter>
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/judul/movie/42')
  })

  it('shows TV label for tv type', () => {
    const tvItem = { id: 99, title: 'Test Series', type: 'tv', media_type: 'tv', first_air_date: '2023-06-15', vote_average: 8 }
    render(
      <BrowserRouter>
        <PosterCard item={tvItem} saved={false} />
      </BrowserRouter>
    )
    expect(screen.getByText('2023 · Series')).toBeInTheDocument()
  })

  it('renders toggle button', () => {
    render(
      <BrowserRouter>
        <PosterCard item={baseItem} saved={false} />
      </BrowserRouter>
    )
    const btn = screen.getByLabelText('Simpan Test Film ke daftar')
    expect(btn).toBeInTheDocument()
  })

  it('calls onToggle when button clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const onToggle = vi.fn()
    render(
      <BrowserRouter>
        <PosterCard item={baseItem} saved={false} onToggle={onToggle} />
      </BrowserRouter>
    )
    await userEvent.click(screen.getByLabelText('Simpan Test Film ke daftar'))
    expect(onToggle).toHaveBeenCalledWith(baseItem)
  })
})