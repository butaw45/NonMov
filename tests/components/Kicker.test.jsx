import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Kicker from '../../src/components/Kicker.jsx'
import React from 'react'

describe('Kicker', () => {
  it('renders no and label text', () => {
    render(<Kicker no={1} label="Testing" />)
    const el = screen.getByText(/NO\. 00001 · Testing/)
    expect(el).toBeInTheDocument()
  })

  it('pads no to 5 digits', () => {
    render(<Kicker no={42} label="Series" />)
    expect(screen.getByText(/NO\. 00042 · Series/)).toBeInTheDocument()
  })

  it('handles string no', () => {
    render(<Kicker no="7" label="Episode" />)
    expect(screen.getByText(/NO\. 00007 · Episode/)).toBeInTheDocument()
  })
})