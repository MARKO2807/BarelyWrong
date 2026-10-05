import { z } from 'zod'
import { STORED } from './keys'
import { readStored, removeStored, writeStored, type StoredValue } from './versioned'

// Questions shown on this device; new games skip them.

const stored: StoredValue<string[]> = { ...STORED.played, schema: z.array(z.string()) }

export function getPlayedIds(): Set<string> {
  return new Set(readStored(stored) ?? [])
}

export function markPlayed(questionIds: Iterable<string>): boolean {
  const played = getPlayedIds()
  for (const id of questionIds) played.add(id)
  return writeStored(stored, [...played])
}

/** Brings back some played questions, e.g. all of one round kind that ran out. */
export function unmarkPlayed(questionIds: Iterable<string>): boolean {
  const played = getPlayedIds()
  for (const id of questionIds) played.delete(id)
  return writeStored(stored, [...played])
}

/** Forgets every played question, so all of them can come up again. */
export function resetPlayed(): boolean {
  return removeStored(stored)
}
