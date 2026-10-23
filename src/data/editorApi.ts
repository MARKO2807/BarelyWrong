import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { GAME_LENGTHS, QUESTION_FORMATS, ROUND_KINDS, TOPICS } from '../engine'
import { QUESTION_STATUSES, type QuestionStatus } from './batchSchema'
import type { ImportRow, SimilarMatch } from './import'
import { readAll } from './readAll'
import { REPORT_REASONS } from './reports'
import { SCREENS } from './screens'

// Database access for the editor, shared by the /admin screens and the scripts. Every function
// takes a client signed in as the editor; the database refuses everyone else (RLS).

export const editorQuestionSchema = z.object({
  id: z.string(),
  topic: z.enum(TOPICS),
  format: z.enum(QUESTION_FORMATS),
  difficulty: z.literal([1, 2, 3]),
  status: z.enum(QUESTION_STATUSES),
  origin: z.string(),
  source: z.string().nullable(),
  tags: z.array(z.string()),
  time_sensitive: z.boolean(),
  checked_at: z.string().nullable(),
  editor_note: z.string().nullable(),
  has_embedding: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  question: z.string(),
  answer: z.string(),
  accept: z.array(z.string()),
  note: z.string().nullable(),
  shown: z.number(),
  correct: z.number(),
  open_reports: z.number(),
})
export type EditorQuestion = z.infer<typeof editorQuestionSchema>

export const reportSchema = z.object({
  id: z.number(),
  question_id: z.string(),
  reason: z.enum(REPORT_REASONS),
  comment: z.string().nullable(),
  resolved: z.boolean(),
  created_at: z.string(),
})
export type Report = z.infer<typeof reportSchema>

export function fetchEditorQuestions(db: SupabaseClient): Promise<EditorQuestion[]> {
  return readAll(
    (from, to) => db.from('editor_questions').select('*').order('id').range(from, to),
    editorQuestionSchema,
  )
}

export function fetchReports(db: SupabaseClient): Promise<Report[]> {
  return readAll(
    (from, to) =>
      db
        .from('question_reports')
        .select('id, question_id, reason, comment, resolved, created_at')
        .order('created_at', { ascending: false })
        .range(from, to),
    reportSchema,
  )
}

export async function setReportResolved(db: SupabaseClient, id: number, resolved: boolean) {
  const { error } = await db.from('question_reports').update({ resolved }).eq('id', id)
  if (error) throw error
}

/** The fields the editor can change. */
export interface QuestionChanges {
  topic: EditorQuestion['topic']
  format: EditorQuestion['format']
  difficulty: EditorQuestion['difficulty']
  status: QuestionStatus
  source: string | null
  tags: string[]
  time_sensitive: boolean
  checked_at: string | null
  editor_note: string | null
  question: string
  answer: string
  accept: string[]
  note: string | null
}

export async function saveQuestion(db: SupabaseClient, id: string, changes: QuestionChanges) {
  const { question, answer, accept, note, topic, ...meta } = changes
  const questions = await db
    .from('questions')
    .update({ ...meta, topic_id: topic })
    .eq('id', id)
  if (questions.error) throw questions.error
  const texts = await db
    .from('question_texts')
    .update({ question, answer, accept, note })
    .eq('question_id', id)
    .eq('lang', 'hr')
  if (texts.error) throw texts.error
}

export async function setStatus(db: SupabaseClient, id: string, status: QuestionStatus) {
  const { error } = await db.from('questions').update({ status }).eq('id', id)
  if (error) throw error
}

/** Writes a checked batch; returns the id given to each row, by position. */
export async function importRows(
  db: SupabaseClient,
  rows: readonly ImportRow[],
): Promise<Map<number, string>> {
  const { data, error } = await db.rpc('import_questions', { items: rows })
  if (error) throw error
  const result = z.array(z.object({ item_index: z.number(), id: z.string() })).parse(data)
  return new Map(result.map((r) => [r.item_index, r.id]))
}

const similarRowSchema = z.object({ id: z.string(), similarity: z.number() })

/** Stored questions closest to an embedding that is not stored yet. */
export async function matchQuestions(
  db: SupabaseClient,
  embedding: readonly number[],
  minSimilarity: number,
): Promise<SimilarMatch[]> {
  const { data, error } = await db.rpc('match_questions', {
    query_embedding: `[${embedding.join(',')}]`,
    min_similarity: minSimilarity,
  })
  if (error) throw error
  return z.array(similarRowSchema).parse(data)
}

export interface SimilarPair {
  id: string
  other_id: string
  similarity: number
}

/** Every pair of stored questions at least this similar. */
export async function fetchSimilarPairs(
  db: SupabaseClient,
  minSimilarity: number,
): Promise<SimilarPair[]> {
  const { data, error } = await db.rpc('similar_pairs', { min_similarity: minSimilarity })
  if (error) throw error
  return z
    .array(z.object({ id: z.string(), other_id: z.string(), similarity: z.number() }))
    .parse(data)
}

/** Questions without an embedding, with the text it is computed from. */
export async function fetchMissingEmbeddings(
  db: SupabaseClient,
): Promise<{ id: string; question: string; answer: string }[]> {
  const questions = await fetchEditorQuestions(db)
  return questions
    .filter((q) => !q.has_embedding)
    .map(({ id, question, answer }) => ({ id, question, answer }))
}

export async function saveEmbedding(db: SupabaseClient, id: string, embedding: readonly number[]) {
  const { error } = await db
    .from('questions')
    .update({ embedding: `[${embedding.join(',')}]` })
    .eq('id', id)
  if (error) throw error
}

// Activity (spec 9.4) ----------------------------------------------------------------------------

export const GAME_STATUSES = ['open', 'finished', 'abandoned'] as const

export const editorGameSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  team_count: z.number(),
  length: z.enum(GAME_LENGTHS),
  seconds_per_question: z.number(),
  fastest_finger: z.boolean(),
  rounds: z.array(z.enum(ROUND_KINDS)),
  rematch: z.boolean(),
  screen: z.enum(SCREENS),
  time_zone: z.string().nullable(),
  theme: z.string(),
  sound: z.boolean(),
  rounds_done: z.number(),
  status: z.enum(GAME_STATUSES),
  last_event_at: z.string().nullable(),
  events: z.array(
    z.object({
      event: z.enum(['turn', 'round', 'finished', 'abandoned']),
      round: z.number(),
      /** Question number in the round for 'turn' (since _activity_turns.sql). */
      turn: z.number().default(0),
      at: z.string(),
    }),
  ),
  // Since migration _activity_window_language.sql; older games have nulls.
  window_width: z.number().nullish(),
  window_height: z.number().nullish(),
  language: z.string().nullish(),
})
export type EditorGame = z.infer<typeof editorGameSchema>

export const visitCountSchema = z.object({
  day: z.string(),
  screen: z.enum(SCREENS),
  referrer: z.string().nullable(),
  /** Only the language, e.g. 'hr'; null for older visits. */
  language: z.string().nullish(),
  visits: z.number(),
})
export type VisitCount = z.infer<typeof visitCountSchema>

/** Every game, newest first. */
export function fetchGames(db: SupabaseClient): Promise<EditorGame[]> {
  return readAll(
    (from, to) =>
      db.from('editor_games').select('*').order('created_at', { ascending: false }).range(from, to),
    editorGameSchema,
  )
}

/** Visits per day (Croatian time), screen and referrer, all time. */
export async function fetchVisitCounts(db: SupabaseClient): Promise<VisitCount[]> {
  const { data, error } = await db.rpc('activity_visits', { p_since: null })
  if (error) throw error
  return z.array(visitCountSchema).parse(data)
}

/** Deletes games for good, with their progress. */
export async function deleteGames(db: SupabaseClient, ids: readonly string[]) {
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await db
      .from('game_starts')
      .delete()
      .in('id', ids.slice(i, i + 100))
    if (error) throw error
  }
}

/** Full backup (spec 9.2): questions with texts, reports, statistics and activity. */
export async function exportDatabase(db: SupabaseClient) {
  const answerEvents = readAll(
    (from, to) =>
      db
        .from('answer_events')
        .select('id, question_id, kind, correct, created_at')
        .order('id')
        .range(from, to),
    z.object({
      id: z.number(),
      question_id: z.string(),
      kind: z.string(),
      correct: z.boolean(),
      created_at: z.string(),
    }),
  )
  const [questions, reports, events, games, visits] = await Promise.all([
    fetchEditorQuestions(db),
    fetchReports(db),
    answerEvents,
    fetchGames(db),
    fetchVisitCounts(db),
  ])
  return {
    exportedAt: new Date().toISOString(),
    questions,
    reports,
    answerEvents: events,
    games,
    visits,
  }
}
