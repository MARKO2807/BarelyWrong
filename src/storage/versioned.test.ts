// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { storageKey } from './keys'
import { readStored, writeStored, type StoredValue } from './versioned'

// A made-up value that went from v1 ({ name }) to v2 ({ firstName }) to v3 (adds { age }).
const v3: StoredValue<{ firstName: string; age: number }> = {
  name: 'person',
  version: 3,
  schema: z.object({ firstName: z.string(), age: z.number() }),
  migrations: {
    1: (data) => ({ firstName: (data as { name: string }).name }),
    2: (data) => ({ ...(data as object), age: 0 }),
  },
}

beforeEach(() => {
  localStorage.clear()
})

describe('readStored', () => {
  it('reads the current version', () => {
    writeStored(v3, { firstName: 'Ana', age: 30 })
    expect(readStored(v3)).toEqual({ firstName: 'Ana', age: 30 })
  })

  it('migrates old data step by step and moves it to the current key', () => {
    localStorage.setItem(storageKey('person', 1), JSON.stringify({ name: 'Ivo' }))
    expect(readStored(v3)).toEqual({ firstName: 'Ivo', age: 0 })
    expect(localStorage.getItem(storageKey('person', 1))).toBeNull()
    expect(JSON.parse(localStorage.getItem(storageKey('person', 3))!)).toEqual({
      firstName: 'Ivo',
      age: 0,
    })
  })

  it('starts from the newest old version it finds', () => {
    localStorage.setItem(storageKey('person', 1), JSON.stringify({ name: 'Old' }))
    localStorage.setItem(storageKey('person', 2), JSON.stringify({ firstName: 'Newer' }))
    expect(readStored(v3)).toEqual({ firstName: 'Newer', age: 0 })
  })

  it('drops old data it cannot migrate', () => {
    const noMigrations = { ...v3, migrations: undefined }
    localStorage.setItem(storageKey('person', 2), JSON.stringify({ firstName: 'Ivo' }))
    expect(readStored(noMigrations)).toBeUndefined()
    expect(localStorage.getItem(storageKey('person', 2))).toBeNull()

    localStorage.setItem(storageKey('person', 1), JSON.stringify(null))
    expect(readStored(v3)).toBeUndefined()
  })

  it('reads invalid current data as missing', () => {
    localStorage.setItem(storageKey('person', 3), JSON.stringify({ firstName: 1 }))
    expect(readStored(v3)).toBeUndefined()
  })
})
