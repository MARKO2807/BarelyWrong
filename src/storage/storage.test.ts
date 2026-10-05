// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, KEYS, THEMES, loadSettings, resetPlayed, saveSettings } from '.'
import { themeBootScript } from './theme-boot'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('keys', () => {
  it('use the bw: prefix and a schema version', () => {
    for (const key of Object.values(KEYS)) {
      expect(key).toMatch(/^bw:[a-zA-Z]+:v\d+$/)
    }
  })
})

describe('settings', () => {
  it('returns defaults when nothing is saved', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('defaults to the dark theme', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('dark')
  })

  it('round-trips saved settings', () => {
    saveSettings({ theme: 'light', sound: false })
    expect(loadSettings()).toEqual({ theme: 'light', sound: false })
  })

  it('returns defaults for corrupt JSON', () => {
    localStorage.setItem(KEYS.settings, '{not json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('treats the old "system" theme as dark', () => {
    localStorage.setItem(KEYS.settings, JSON.stringify({ theme: 'system', sound: true }))
    expect(loadSettings().theme).toBe('dark')
  })

  it('keeps valid fields when another field is invalid', () => {
    localStorage.setItem(KEYS.settings, JSON.stringify({ theme: 'neon', sound: false }))
    expect(loadSettings()).toEqual({ theme: 'dark', sound: false })
  })

  it('works when local storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    expect(saveSettings({ theme: 'dark', sound: true })).toBe(false)
  })
})

describe('resetPlayed', () => {
  it('removes only the played questions', () => {
    localStorage.setItem(KEYS.played, JSON.stringify(['sport-0001']))
    saveSettings({ theme: 'dark', sound: true })
    expect(resetPlayed()).toBe(true)
    expect(localStorage.getItem(KEYS.played)).toBeNull()
    expect(loadSettings().theme).toBe('dark')
  })
})

describe('theme boot script', () => {
  function runBoot(): string | undefined {
    delete document.documentElement.dataset.theme
    new Function(themeBootScript)()
    return document.documentElement.dataset.theme
  }

  it.each(THEMES)('applies the saved %s theme', (theme) => {
    saveSettings({ theme, sound: true })
    expect(runBoot()).toBe(theme)
  })

  it('falls back to dark like loadSettings', () => {
    for (const stored of [null, 'null', '{not json', JSON.stringify({ theme: 'system' })]) {
      if (stored === null) localStorage.clear()
      else localStorage.setItem(KEYS.settings, stored)
      expect(runBoot()).toBe(loadSettings().theme)
      expect(runBoot()).toBe('dark')
    }
  })
})
