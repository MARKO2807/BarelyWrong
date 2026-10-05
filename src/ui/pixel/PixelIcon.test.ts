import { describe, expect, it } from 'vitest'
import { gridToPath } from './PixelIcon'

describe('gridToPath', () => {
  it('merges runs of filled pixels into one rectangle per run', () => {
    expect(gridToPath(['##.#', '....', '.##.'])).toBe('M0 0h2v1h-2zM3 0h1v1h-1zM1 2h2v1h-2z')
  })

  it('returns an empty path for an empty grid', () => {
    expect(gridToPath(['...'])).toBe('')
  })
})
