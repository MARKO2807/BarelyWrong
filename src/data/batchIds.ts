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

export function formatQuestionId(topic: string, number: number): string {
  return `${topic}-${String(number).padStart(4, '0')}`
}

/** The number in `sport-0042`. */
export function questionNumber(id: string): number {
  return Number(id.slice(id.lastIndexOf('-') + 1))
}

/**
 * Ids for the local question files. Imported questions carry the id the database gave them; a
 * question that is not imported yet gets a provisional one after the highest id in its topic
 * (files in name order), so local games work before the import.
 */
export function assignIds(files: readonly BatchFile[]): IdentifiedQuestion[] {
  const items = [...files].sort((a, b) => a.name.localeCompare(b.name)).flatMap((f) => f.items)
  const highest = new Map<string, number>()
  for (const item of items) {
    if (item.id)
      highest.set(item.topic, Math.max(highest.get(item.topic) ?? 0, questionNumber(item.id)))
  }
  return items.map((item) => {
    if (item.id) return { ...item, id: item.id }
    const next = (highest.get(item.topic) ?? 0) + 1
    highest.set(item.topic, next)
    return { ...item, id: formatQuestionId(item.topic, next) }
  })
}
