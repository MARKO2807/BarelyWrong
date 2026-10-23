import { describe, expect, it } from 'vitest'
import { referrerHost, screenOf } from './activity'

describe('screenOf', () => {
  it('sorts window widths into kinds of screens', () => {
    expect(screenOf(375)).toBe('phone')
    expect(screenOf(640)).toBe('phone')
    expect(screenOf(768)).toBe('tablet')
    expect(screenOf(1024)).toBe('tablet')
    expect(screenOf(1440)).toBe('laptop')
    expect(screenOf(1920)).toBe('large')
  })
})

describe('referrerHost', () => {
  it('keeps only the host of another site', () => {
    expect(referrerHost('https://www.google.com/search?q=kviz', 'barelywrong.com')).toBe(
      'www.google.com',
    )
  })

  it('ignores direct visits, links inside the site and junk', () => {
    expect(referrerHost('', 'barelywrong.com')).toBeNull()
    expect(referrerHost('https://barelywrong.com/new-game', 'barelywrong.com')).toBeNull()
    expect(referrerHost('not a url', 'barelywrong.com')).toBeNull()
  })
})
