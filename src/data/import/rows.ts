import type { ImportItem } from './prepare'

/** One element of the `items` argument of the `import_questions` database function. */
export interface ImportRow {
  id?: string
  topic: string
  format: string
  difficulty: number
  status: string
  origin: string
  source: string | null
  tags: string[]
  time_sensitive: boolean
  checked_at: string
  editor_note: string | null
  question: string
  answer: string
  accept: string[]
  note: string | null
  /** pgvector text form, `[0.1,0.2,…]`. */
  embedding: string | null
}

export function toImportRow(item: ImportItem, embedding?: readonly number[]): ImportRow {
  return {
    ...(item.id ? { id: item.id } : {}),
    topic: item.topic,
    format: item.format,
    difficulty: item.difficulty,
    status: item.status,
    origin: item.origin,
    source: item.source ?? null,
    tags: item.tags,
    time_sensitive: item.timeSensitive,
    checked_at: item.checkedAt,
    editor_note: item.editorNote ?? null,
    question: item.question,
    answer: item.answer,
    accept: item.accept,
    note: item.note ?? null,
    embedding: embedding ? `[${embedding.join(',')}]` : null,
  }
}

/**
 * The original file with the ids the database gave, so it records what was imported and a second
 * import of the same file skips those questions. Only `id` is added (as the first field).
 */
export function withAssignedIds(
  data: readonly unknown[],
  assigned: ReadonlyMap<number, string>,
): unknown[] {
  return data.map((raw, index) => {
    const id = assigned.get(index)
    return id && typeof raw === 'object' && raw !== null ? { id, ...raw } : raw
  })
}
