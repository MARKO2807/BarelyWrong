import type { BatchQuestion } from './batchSchema'

export interface BatchFile {
  /** File name, e.g. `sport-pilot.json`. */
  name: string
  items: BatchQuestion[]
}

export interface IdentifiedQuestion extends BatchQuestion {
  /** `<topic>-<four digits>`, as the import generates them (spec 9.1). */
  id: string
}

/**
 * Gives every question its database id: files in name order, questions in file order, numbered
 * per topic from 0001. The pilot seed migration and the local question files both use this, so a
 * question has the same id in the database and in a game.
 */
export function assignIds(files: readonly BatchFile[]): IdentifiedQuestion[] {
  const counters = new Map<string, number>()
  return [...files]
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((file) =>
      file.items.map((item) => {
        const next = (counters.get(item.topic) ?? 0) + 1
        counters.set(item.topic, next)
        return { ...item, id: `${item.topic}-${String(next).padStart(4, '0')}` }
      }),
    )
}
