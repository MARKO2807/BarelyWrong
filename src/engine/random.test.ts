import { describe, expect, it } from 'vitest'
import { createSeededRng, pickOne, randomInt, shuffle } from './random'

describe('createSeededRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createSeededRng(42)
    const b = createSeededRng(42)
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b))
  })

  it('stays within [0, 1)', () => {
    const rng = createSeededRng(7)
    for (let i = 0; i < 1000; i++) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('helpers', () => {
  it('randomInt stays below the bound and reaches every value', () => {
    const rng = createSeededRng(3)
    const seen = new Set(Array.from({ length: 200 }, () => randomInt(rng, 4)))
    expect([...seen].sort()).toEqual([0, 1, 2, 3])
  })

  it('shuffle returns a permutation without touching the input', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const result = shuffle(createSeededRng(9), input)
    expect(input).toEqual([1, 2, 3, 4, 5, 6])
    expect([...result].sort()).toEqual(input)
  })

  it('pickOne refuses an empty list', () => {
    expect(() => pickOne(createSeededRng(1), [])).toThrow()
  })
})
