import { STORED, storageKey } from './keys'

// After a deploy, a tab opened on the old version asks for code files that no longer exist. It
// reloads once to get the new version; this remembers (for this tab only) when it last did, so a
// file that is really missing shows an error page instead of reloading forever.

const KEY = storageKey(STORED.reload.name, STORED.reload.version)
/** A second failure within this time is not a new version: stop reloading. */
const GUARD_MS = 30_000

/** True when the page may reload now; it then counts as reloaded. */
export function claimReload(now: number = Date.now()): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(KEY) ?? 0)
    if (now - last < GUARD_MS) return false
    window.sessionStorage.setItem(KEY, String(now))
    return true
  } catch {
    // Without storage there is no guard against a loop, so don't reload by itself.
    return false
  }
}
