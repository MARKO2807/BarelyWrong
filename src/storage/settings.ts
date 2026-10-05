import { z } from 'zod'
import { KEYS } from './keys'
import { readJson, writeJson } from './local'

/** Dark first: it is the default and the order shown in Settings. */
export const THEMES = ['dark', 'light'] as const
export type Theme = (typeof THEMES)[number]

// Each field falls back on its own, so one bad value doesn't wipe the rest.
const settingsSchema = z.object({
  theme: z.enum(THEMES).catch('dark'),
  sound: z.boolean().catch(true),
})

export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = { theme: 'dark', sound: true }

export function loadSettings(): Settings {
  const parsed = settingsSchema.safeParse(readJson(KEYS.settings))
  return parsed.success ? parsed.data : { ...DEFAULT_SETTINGS }
}

export function saveSettings(settings: Settings): boolean {
  return writeJson(KEYS.settings, settings)
}
