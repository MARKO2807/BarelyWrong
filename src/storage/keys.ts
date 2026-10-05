/**
 * Local storage keys: `bw:` prefix plus a schema version per key.
 * When a stored shape changes, bump its version and migrate from the old key.
 */
export const KEYS = {
  settings: 'bw:settings:v1',
  played: 'bw:played:v1',
} as const
