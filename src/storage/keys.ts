// No imports: vite.config.ts loads this file (through theme-boot.ts) at build time.

/**
 * Everything kept in local storage, by name and schema version. When a stored shape changes,
 * bump its version and add a migration from the old one (see versioned.ts).
 */
export const STORED = {
  settings: { name: 'settings', version: 1 },
  // v2: question ids changed from file-based (sport-pilot-3) to database ids (sport-0003).
  played: { name: 'played', version: 2 },
  // v3: games keep the host's score corrections. v4: games have an id (activity log).
  game: { name: 'game', version: 4 },
  // v2: same shape (briefly held team icons).
  lastSetup: { name: 'lastSetup', version: 2 },
  // v2: also visits and games for the editor's activity page. v3: window size and language.
  // v4: game progress after every question.
  outbox: { name: 'outbox', version: 4 },
  // The editor's Supabase session (src/storage/auth.ts).
  auth: { name: 'auth', version: 1 },
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
  outbox: storageKey(STORED.outbox.name, STORED.outbox.version),
} as const
