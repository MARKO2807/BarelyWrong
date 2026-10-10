import { z } from 'zod'
import { questionSchema, type Question } from '../engine'
import { assignIds, type IdentifiedQuestion } from './batchIds'
import { batchSchema } from './batchSchema'
import { readAll } from './readAll'
import { supabase } from './supabase'

// Where new games get their questions. Until the pilot is approved in the editor (phase 5) the
// database view has no approved questions, so games read the local batch files, with the same
// ids the questions have in the database.
const SOURCE: 'local' | 'supabase' =
  import.meta.env.VITE_QUESTIONS_SOURCE === 'supabase' ? 'supabase' : 'local'

const batches = import.meta.glob<unknown>('../../content/batches/*.json', { import: 'default' })

function toGameQuestion(item: IdentifiedQuestion): Question {
  return {
    id: item.id,
    topic: item.topic,
    format: item.format,
    difficulty: item.difficulty,
    question: item.question,
    answer: item.answer,
    accept: item.accept,
    note: item.note ?? null,
  }
}

/** Batch files → game questions, leaving out rejected and archived ones. */
export function questionsFromBatches(files: Record<string, unknown>): Question[] {
  const parsed = Object.entries(files).map(([path, data]) => ({
    name: path.split('/').pop()!,
    items: batchSchema.parse(data),
  }))
  return assignIds(parsed)
    .filter((item) => item.status !== 'rejected' && item.status !== 'archived')
    .map(toGameQuestion)
}

async function fetchLocal(): Promise<Question[]> {
  const entries = await Promise.all(
    Object.entries(batches).map(async ([path, load]) => [path, await load()] as const),
  )
  return questionsFromBatches(Object.fromEntries(entries))
}

/** A row of the `game_questions` view (approved questions only). */
const gameQuestionRow = questionSchema.extend({ note: z.string().nullable() })

function fetchRemote(): Promise<Question[]> {
  const db = supabase
  if (!db) return Promise.reject(new Error('Supabase is not configured'))
  return readAll(
    (from, to) =>
      db
        .from('game_questions')
        .select('id, topic, format, difficulty, question, answer, accept, note')
        .order('id')
        .range(from, to),
    gameQuestionRow,
  )
}

/** Every question a new game can draw from. */
export function fetchQuestions(): Promise<Question[]> {
  return SOURCE === 'supabase' ? fetchRemote() : fetchLocal()
}
