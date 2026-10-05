import { KEYS } from './keys'
import { removeKey } from './local'

/** Forgets which questions were played on this device, so all of them can come up again. */
export function resetPlayed(): boolean {
  return removeKey(KEYS.played)
}
