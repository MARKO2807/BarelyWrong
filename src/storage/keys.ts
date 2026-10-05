// No imports: vite.config.ts loads this file (through theme-boot.ts) at build time.

/**
 * Everything kept in local storage, by name and schema version. When a stored shape changes,
 * bump its version and add a migration from the old one (see versioned.ts).
 */
export const STORED = {
  settings: { name: 'settings', version: 1 },
  played: { name: 'played', version: 1 },
  game: { name: 'game', version: 1 },
  lastSetup: { name: 'lastSetup', version: 1 },
} as const

/** `bw:` prefix plus the schema version, e.g. `bw:settings:v1`. */
export function storageKey(name: string, version: number): string {
  return `bw:${name}:v${version}`
}

export const KEYS = {
  settings: storageKey(STORED.settings.name, STORED.settings.version),
  played: storageKey(STORED.played.name, STORED.played.version),
  game: storageKey(STORED.game.name, STORED.game.version),
  lastSetup: storageKey(STORED.lastSetup.name, STORED.lastSetup.version),
} as const
