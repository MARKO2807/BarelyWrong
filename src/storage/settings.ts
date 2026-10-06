import { z } from 'zod'
import { STORED } from './keys'
import { readStored, writeStored, type StoredValue } from './versioned'

/** Dark first: it is the default and the order shown in Settings. */
export const THEMES = ['dark', 'light'] as const
export type Theme = (typeof THEMES)[number]

// Each field falls back on its own, so one bad value doesn't wipe the rest.
const settingsSchema = z.object({
  theme: z.enum(THEMES).catch('dark'),
  sound: z.boolean().catch(false),
})

export type Settings = z.infer<typeof settingsSchema>

/** Sound starts off: the game is often played late at night. */
export const DEFAULT_SETTINGS: Settings = { theme: 'dark', sound: false }

const stored: StoredValue<Settings> = { ...STORED.settings, schema: settingsSchema }

export function loadSettings(): Settings {
  return readStored(stored) ?? { ...DEFAULT_SETTINGS }
}

export function saveSettings(settings: Settings): boolean {
  return writeStored(stored, settings)
}
