import { STORED, storageKey } from './keys'
import { readString, removeKey, writeString } from './local'

/**
 * Where Supabase keeps the editor's sign-in (src/data/editorSession.ts). Supabase names its own
 * entries (e.g. `editor`); they are stored as `bw:auth-editor:v1`.
 */
export const authStorage = {
  getItem: (key: string) =>
    readString(storageKey(`${STORED.auth.name}-${key}`, STORED.auth.version)),
  setItem: (key: string, value: string) => {
    writeString(storageKey(`${STORED.auth.name}-${key}`, STORED.auth.version), value)
  },
  removeItem: (key: string) => {
    removeKey(storageKey(`${STORED.auth.name}-${key}`, STORED.auth.version))
  },
}
