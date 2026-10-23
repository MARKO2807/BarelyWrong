import { describe, expect, it } from 'vitest'
import { mailFields, referrerHost, screenOf } from './activity'

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

describe('mailFields', () => {
  it('describes a new game field by field', () => {
    const fields = mailFields(
      {
        teamCount: 2,
        length: 'full',
        secondsPerQuestion: 75,
        fastestFinger: true,
        rounds: ['sport', 'estimate'],
        rematch: false,
        screen: 'large',
        timeZone: 'Europe/Zagreb',
        theme: 'dark',
        sound: true,
        windowWidth: 1920,
        windowHeight: 1080,
        language: 'hr-HR',
      },
      'https://barelywrong.com',
    )
    expect(fields).toEqual({
      Timovi: '2',
      Duljina: 'duga (2 rundi)',
      'Vrijeme po pitanju': '75 s',
      'Najbrži prst': 'da',
      Revanš: 'ne',
      Ekran: 'veliki ekran (više od 1600 px), prozor 1920 × 1080',
      Teme: 'Sport, Procjena',
      'Vremenska zona': 'Europe/Zagreb',
      'Jezik preglednika': 'hr-HR',
      'Tema i zvuk': 'tamna, zvuk uključen',
      Pregled: 'https://barelywrong.com/admin/games',
    })
  })

  it('leaves out an unknown window size', () => {
    const fields = mailFields(
      {
        teamCount: 3,
        length: 'short',
        secondsPerQuestion: 60,
        fastestFinger: false,
        rounds: ['music'],
        rematch: true,
        screen: 'phone',
        timeZone: null,
        theme: 'light',
        sound: false,
        windowWidth: null,
        windowHeight: null,
        language: null,
      },
      '',
    )
    expect(fields.Ekran).toBe('mobitel (do 640 px)')
    expect(fields['Jezik preglednika']).toBe('?')
  })
})
