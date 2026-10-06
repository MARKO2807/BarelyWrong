import type { Question } from '../engine'
import { batchSchema } from './batchSchema'

// Until Supabase arrives (phase 4), games use the local batch files in content/batches.
// Ids are temporary (file name + position); real ids come from the import.

const batches = import.meta.glob<unknown>('../../content/batches/*.json', { import: 'default' })

/** Turns one batch file into game questions, leaving out rejected and archived ones. */
export function questionsFromBatch(path: string, data: unknown): Question[] {
  const name = path
    .split('/')
    .pop()!
    .replace(/\.json$/, '')
  return batchSchema.parse(data).flatMap((item, index) =>
    item.status === 'rejected' || item.status === 'archived'
      ? []
      : [
          {
            id: `${name}-${index + 1}`,
            topic: item.topic,
            format: item.format,
            difficulty: item.difficulty,
            question: item.question,
            answer: item.answer,
            accept: item.accept,
            note: item.note ?? null,
          },
        ],
  )
}

/** Every question a new game can draw from. */
export async function fetchQuestions(): Promise<Question[]> {
  const loaded = await Promise.all(
    Object.entries(batches).map(async ([path, load]) => questionsFromBatch(path, await load())),
  )
  return loaded.flat()
}
