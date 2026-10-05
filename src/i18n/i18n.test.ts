import { describe, expect, it } from 'vitest'
import { t, tList } from '.'

describe('t', () => {
  it('returns the text for a key', () => {
    expect(t('nav.play')).toBe('Igraj')
  })

  it('fills placeholders', () => {
    expect(t('meta.pageTitle', { page: 'Uskoro' })).toBe('Uskoro · Barely Wrong')
  })

  it('leaves unknown placeholders untouched', () => {
    expect(t('meta.pageTitle', { other: 'x' })).toBe('{page} · Barely Wrong')
  })
})

describe('tList', () => {
  it('returns all eight how-to-play steps', () => {
    expect(tList('howToPlay.steps')).toHaveLength(8)
  })
})
