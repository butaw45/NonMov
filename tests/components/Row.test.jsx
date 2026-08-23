import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Row from '../../src/components/Row.jsx'
import React from 'react'

const sampleItems = [
  { id: 1, title: 'Movie One', type: 'movie', poster_path: '/1.jpg', vote_average: 6 },
  { id: 2, title: 'Movie Two', type: 'movie', poster_path: '/2.jpg', vote_average: 7 },
]

describe('Row', () => {
  it('renders title and kicker', () => {
    render(
      <BrowserRouter>
        <Row title="Test Row" kicker="Top Picks" items={sampleItems} />
      </BrowserRouter>
    )
    expect(screen.getByText('Test Row')).toBeInTheDocument()
    expect(screen.getByText('Top Picks')).toBeInTheDocument()
  })

  it('renders PosterCards for each item', () => {
    render(
      <BrowserRouter>
        <Row title="Row" items={sampleItems} />
      </BrowserRouter>
    )
    expect(screen.getAllByText('Movie One')).toHaveLength(2)
    expect(screen.getAllByText('Movie Two')).toHaveLength(2)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
  })

  it('returns null when items is empty', () => {
    const { container } = render(
      <BrowserRouter>
        <Row title="Empty" items={[]} />
      </BrowserRouter>
    )
    expect(container.innerHTML).toBe('')
  })

  it('returns null when items is missing', () => {
    const { container } = render(
      <BrowserRouter>
        <Row title="Null" items={null} />
      </BrowserRouter>
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders numbered mode', () => {
    render(
      <BrowserRouter>
        <Row title="Ranked" items={sampleItems} numbered />
      </BrowserRouter>
    )
    // Each item gets a rank box with a rank-num (aria-hidden)
    const ranks = document.querySelectorAll('.rank')
    expect(ranks).toHaveLength(2)
    // Rank numbers are aria-hidden, check them directly
    expect(ranks[0].querySelector('.rank-num')).toHaveTextContent('1')
    expect(ranks[1].querySelector('.rank-num')).toHaveTextContent('2')
  })
})