import type { z } from 'zod'
import { storageKey } from './keys'
import { readJson, removeKey, writeJson } from './local'

export interface StoredValue<T> {
  name: string
  version: number
  schema: z.ZodType<T>
  /** `migrations[v]` turns data saved as version v into version v + 1. */
  migrations?: Readonly<Record<number, (data: unknown) => unknown>>
}

function parse<T>(value: StoredValue<T>, data: unknown): T | undefined {
  const parsed = value.schema.safeParse(data)
  return parsed.success ? parsed.data : undefined
}

function migrate<T>(value: StoredValue<T>, data: unknown, fromVersion: number): unknown {
  let current = data
  for (let version = fromVersion; version < value.version; version++) {
    const step = value.migrations?.[version]
    if (!step) return undefined
    try {
      current = step(current)
    } catch {
      return undefined
    }
  }
  return current
}

/**
 * Reads and validates a stored value; anything invalid reads as missing. Data saved under an
 * older version is migrated, saved under the current key, and the old key is removed.
 */
export function readStored<T>(value: StoredValue<T>): T | undefined {
  const key = storageKey(value.name, value.version)
  const current = readJson(key)
  if (current !== undefined) return parse(value, current)

  for (let version = value.version - 1; version >= 1; version--) {
    const oldKey = storageKey(value.name, version)
    const old = readJson(oldKey)
    if (old === undefined) continue
    removeKey(oldKey)
    const migrated = migrate(value, old, version)
    const result = migrated === undefined ? undefined : parse(value, migrated)
    if (result !== undefined) writeJson(key, result)
    return result
  }
  return undefined
}

export function writeStored<T>(value: StoredValue<T>, data: T): boolean {
  return writeJson(storageKey(value.name, value.version), data)
}

export function removeStored<T>(value: StoredValue<T>): boolean {
  return removeKey(storageKey(value.name, value.version))
}
