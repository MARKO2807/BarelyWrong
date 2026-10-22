import { z } from 'zod'
import {
  candidatesPerDifficulty,
  pickCandidates,
  questionFitsKind,
  questionSchema,
  type Question,
  type ShortageKind,
} from '../engine'
import { assignIds, type IdentifiedQuestion } from './batchIds'
import { batchSchema } from './batchSchema'
import { supabase } from './supabase'

// Where new games get their questions: the database in production, the local batch files
// (content/batches) in development, with the same ids the questions have in the database.
const SOURCE: 'local' | 'supabase' =
  import.meta.env.VITE_QUESTIONS_SOURCE === 'supabase' ? 'supabase' : 'local'

/** Questions are only in Croatian for now (docs/ROADMAP.md, step 2 adds English). */
const LANG = 'hr'

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

/** A row of the `game_candidates` function (approved questions only). */
const candidateRow = questionSchema.extend({ note: z.string().nullable() })
const kindRow = questionSchema.pick({ id: true, topic: true, format: true })

function database() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export interface CandidateRequest {
  teamCount: number
  /** Questions already played on this device; the server leaves them out. */
  playedIds: ReadonlySet<string>
}

/**
 * The questions a new game can draw from: a few random unplayed ones of every round kind and
 * difficulty, not the whole database (spec 3, "Tok podataka u partiji").
 */
export async function fetchCandidates({
  teamCount,
  playedIds,
}: CandidateRequest): Promise<Question[]> {
  const perDifficulty = candidatesPerDifficulty(teamCount)
  if (SOURCE === 'local') {
    return pickCandidates(await fetchLocal(), playedIds, perDifficulty, Math.random)
  }
  const { data, error } = await database().rpc('game_candidates', {
    p_lang: LANG,
    p_per_difficulty: perDifficulty,
    p_exclude: [...playedIds],
  })
  if (error) throw new Error(error.message)
  return z.array(candidateRow).parse(data)
}

/** Which of the given (played) questions fit the kinds that ran out, to bring them back. */
export async function fetchIdsOfKinds(
  ids: ReadonlySet<string>,
  kinds: readonly ShortageKind[],
): Promise<string[]> {
  if (ids.size === 0 || kinds.length === 0) return []
  let questions: z.infer<typeof kindRow>[]
  if (SOURCE === 'local') {
    questions = (await fetchLocal()).filter((q) => ids.has(q.id))
  } else {
    const { data, error } = await database().rpc('question_kinds', { p_ids: [...ids] })
    if (error) throw new Error(error.message)
    questions = z.array(kindRow).parse(data)
  }
  return questions.filter((q) => kinds.some((kind) => questionFitsKind(q, kind))).map((q) => q.id)
}
