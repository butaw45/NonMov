import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Logo from '../../src/components/Logo.jsx'
import React from 'react'

describe('Logo', () => {
  it('renders SVG icon and wordmark by default', () => {
    render(<Logo />)
    const svg = document.querySelector('.logo svg')
    expect(svg).toBeInTheDocument()
    expect(screen.getByText('LAYAR')).toBeInTheDocument()
  })

  it('hides wordmark when withWord=false', () => {
    render(<Logo withWord={false} />)
    expect(screen.queryByText('LAYAR')).not.toBeInTheDocument()
    const svg = document.querySelector('.logo svg')
    expect(svg).toBeInTheDocument()
  })

  it('applies custom height', () => {
    render(<Logo height={50} />)
    const svg = document.querySelector('.logo svg')
    expect(svg).toHaveStyle('height: 50px')
  })
})