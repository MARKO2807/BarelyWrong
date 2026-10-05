import { z } from 'zod'
import { KEYS } from './keys'
import { readJson, writeJson } from './local'

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

// Each field falls back on its own, so one bad value doesn't wipe the rest.
const settingsSchema = z.object({
  theme: z.enum(THEME_PREFERENCES).catch('system'),
  sound: z.boolean().catch(true),
})

export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = { theme: 'system', sound: true }

export function loadSettings(): Settings {
  const parsed = settingsSchema.safeParse(readJson(KEYS.settings))
  return parsed.success ? parsed.data : { ...DEFAULT_SETTINGS }
}

export function saveSettings(settings: Settings): boolean {
  return writeJson(KEYS.settings, settings)
}
