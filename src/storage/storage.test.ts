// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveTheme } from '../app/theme'
import {
  DEFAULT_SETTINGS,
  KEYS,
  THEME_PREFERENCES,
  loadSettings,
  resetPlayed,
  saveSettings,
} from '.'
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

  it('round-trips saved settings', () => {
    saveSettings({ theme: 'light', sound: false })
    expect(loadSettings()).toEqual({ theme: 'light', sound: false })
  })

  it('returns defaults for corrupt JSON', () => {
    localStorage.setItem(KEYS.settings, '{not json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps valid fields when another field is invalid', () => {
    localStorage.setItem(KEYS.settings, JSON.stringify({ theme: 'neon', sound: false }))
    expect(loadSettings()).toEqual({ theme: 'system', sound: false })
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
  function runBoot(systemPrefersDark: boolean): string | undefined {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) => ({ matches: systemPrefersDark, media: query }) as MediaQueryList,
    )
    delete document.documentElement.dataset.theme
    new Function(themeBootScript)()
    return document.documentElement.dataset.theme
  }

  // jsdom has no matchMedia; give spyOn something to replace.
  beforeEach(() => {
    window.matchMedia ??= (() => ({ matches: false })) as unknown as typeof window.matchMedia
  })

  it.each(
    THEME_PREFERENCES.flatMap((theme) => [true, false].map((dark) => [theme, dark] as const)),
  )('matches resolveTheme for %s (system dark: %s)', (theme, systemPrefersDark) => {
    saveSettings({ theme, sound: true })
    expect(runBoot(systemPrefersDark)).toBe(resolveTheme(theme, systemPrefersDark))
  })

  it('follows the system when nothing or garbage is saved', () => {
    expect(runBoot(true)).toBe('dark')
    localStorage.setItem(KEYS.settings, 'null')
    expect(runBoot(false)).toBe('light')
  })
})
