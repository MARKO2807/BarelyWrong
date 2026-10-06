import { z } from 'zod'
import type { QuestionFormat, Topic } from '../../engine'
import { batchQuestionSchema, type BatchQuestion, type QuestionStatus } from '../batchSchema'
import { matchKey, normalizeText, wordCount } from './normalize'

// Checks a batch before it is written (spec 9.1, 8.4, 8.5). Shared by `npm run import` and the
// editor, so both refuse and warn about exactly the same things.

/** Errors block the whole import; warnings are for the editor to read. */
export type IssueLevel = 'error' | 'warning'

export type Issue =
  | { level: 'error'; code: 'invalid'; field: string; message: string }
  | { level: 'error'; code: 'unknownId'; id: string }
  | { level: 'error'; code: 'duplicate'; id: string; status: QuestionStatus }
  | { level: 'error'; code: 'duplicateInBatch'; number: number }
  | { level: 'error'; code: 'answerLimit'; ids: string[] }
  | { level: 'warning'; code: 'answerRepeated'; ids: string[] }
  | { level: 'error'; code: 'noNote' }
  | { level: 'error'; code: 'noSource' }
  | { level: 'error'; code: 'trueFalsePrefix' }
  | { level: 'error'; code: 'trueFalseAnswer' }
  | { level: 'error'; code: 'estimateNumber' }
  | { level: 'warning'; code: 'tooLong'; words: number }
  | { level: 'warning'; code: 'timeWord'; word: string }
  | { level: IssueLevel; code: 'similar'; id: string; similarity: number }

/** A question already in the database, as far as the checks need it. */
export interface ExistingQuestion {
  id: string
  topic: Topic
  format: QuestionFormat
  status: QuestionStatus
  question: string
  answer: string
}

/** A valid question with the defaults from spec 9.1 filled in and its text cleaned up. */
export type ImportItem = BatchQuestion & {
  status: QuestionStatus
  checkedAt: string
}

export interface PlannedItem {
  /** Position in the file, from 0. */
  index: number
  /** For the report; the raw text when the item is invalid. */
  question: string
  /** Null when the item doesn't match the format. */
  item: ImportItem | null
  /** `skip`: already imported (it has an id that exists). */
  action: 'insert' | 'skip'
  issues: Issue[]
}

export interface ImportPlan {
  /** Set when the file itself is unusable (not JSON, not a list); `items` is then empty. */
  fileError: string | null
  items: PlannedItem[]
}

export const MAX_WORDS = 25
/** Spec 8.4: the same answer at most twice in a topic. */
export const MAX_SAME_ANSWER = 2

/** Spec 8.4: „danas”, „trenutno”, „zadnji” (any form). „Današnji” is fine (u današnjem obliku). */
const TIME_WORDS = /(?<!\p{L})(danas(?!\p{L})|trenutn\p{L}*|trenutačn\p{L}*|zadnj\p{L}*)/iu

export const TRUE_FALSE_PREFIX = 'Točno ili netočno:'
export const TRUE_FALSE_ANSWERS = ['Točno', 'Netočno'] as const

function normalize(item: BatchQuestion, today: string): ImportItem {
  const text = (value: string | undefined) => {
    const normalized = value === undefined ? '' : normalizeText(value)
    return normalized === '' ? undefined : normalized
  }
  const list = (values: readonly string[]) => values.map(normalizeText).filter(Boolean)
  return {
    ...item,
    question: normalizeText(item.question),
    answer: normalizeText(item.answer),
    accept: list(item.accept),
    note: text(item.note),
    source: text(item.source),
    tags: list(item.tags),
    editorNote: text(item.editorNote),
    origin: item.origin.trim() || 'own',
    status: item.status ?? (item.origin.trim() === 'own' ? 'approved' : 'review'),
    checkedAt: item.checkedAt ?? today,
  }
}

/** Spec 8.2 and 8.4: what can be checked without a person. */
export function contentIssues(item: ImportItem): Issue[] {
  const issues: Issue[] = []
  if (!item.note) issues.push({ level: 'error', code: 'noNote' })
  if (!item.source) issues.push({ level: 'error', code: 'noSource' })
  if (item.format === 'true_false') {
    if (!item.question.startsWith(TRUE_FALSE_PREFIX))
      issues.push({ level: 'error', code: 'trueFalsePrefix' })
    if (!(TRUE_FALSE_ANSWERS as readonly string[]).includes(item.answer))
      issues.push({ level: 'error', code: 'trueFalseAnswer' })
  }
  if (item.format === 'estimate' && !/\d/.test(item.answer))
    issues.push({ level: 'error', code: 'estimateNumber' })
  const words = wordCount(item.question)
  if (words > MAX_WORDS) issues.push({ level: 'warning', code: 'tooLong', words })
  if (!item.timeSensitive) {
    const word = [item.question, item.answer, item.note ?? ''].join(' ').match(TIME_WORDS)?.[0]
    if (word) issues.push({ level: 'warning', code: 'timeWord', word })
  }
  return issues
}

const pairKey = (question: string, answer: string) => `${matchKey(question)}|${matchKey(answer)}`

/**
 * Checks a parsed JSON file against the format, the writing rules and the questions already in
 * the database. Semantic similarity needs embeddings and is added separately (see similarity.ts).
 */
export function prepareImport(
  data: unknown,
  existing: readonly ExistingQuestion[],
  today: string,
): ImportPlan {
  if (!Array.isArray(data)) return { fileError: 'notList', items: [] }

  const existingById = new Map(existing.map((q) => [q.id, q]))
  const existingPairs = new Map(existing.map((q) => [pairKey(q.question, q.answer), q]))
  // Open questions per topic and answer that are (or may become) part of the game.
  const answers = new Map<string, string[]>()
  const answerKey = (topic: string, answer: string) => `${topic}|${matchKey(answer)}`
  for (const q of existing) {
    if (q.format !== 'open' || q.status === 'rejected' || q.status === 'archived') continue
    const key = answerKey(q.topic, q.answer)
    answers.set(key, [...(answers.get(key) ?? []), q.id])
  }
  const batchPairs = new Map<string, number>()

  const items = data.map((raw, index): PlannedItem => {
    const rawQuestion =
      typeof raw === 'object' && raw && 'question' in raw && typeof raw.question === 'string'
        ? raw.question
        : ''
    const parsed = batchQuestionSchema.safeParse(raw, { error: z.locales.hr().localeError })
    if (!parsed.success) {
      return {
        index,
        question: rawQuestion,
        item: null,
        action: 'insert',
        issues: parsed.error.issues.map((issue) => ({
          level: 'error',
          code: 'invalid',
          field: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      }
    }

    const item = normalize(parsed.data, today)
    if (item.id) {
      if (existingById.has(item.id))
        return { index, question: item.question, item, action: 'skip', issues: [] }
      return {
        index,
        question: item.question,
        item,
        action: 'insert',
        issues: [{ level: 'error', code: 'unknownId', id: item.id }],
      }
    }

    const issues = contentIssues(item)
    const pair = pairKey(item.question, item.answer)
    const twin = existingPairs.get(pair)
    if (twin) issues.push({ level: 'error', code: 'duplicate', id: twin.id, status: twin.status })
    const earlier = batchPairs.get(pair)
    if (earlier !== undefined)
      issues.push({ level: 'error', code: 'duplicateInBatch', number: earlier + 1 })
    else batchPairs.set(pair, index)

    if (item.format === 'open' && item.status !== 'rejected' && item.status !== 'archived') {
      const key = answerKey(item.topic, item.answer)
      const ids = answers.get(key) ?? []
      if (ids.length >= MAX_SAME_ANSWER) issues.push({ level: 'error', code: 'answerLimit', ids })
      else if (ids.length > 0) issues.push({ level: 'warning', code: 'answerRepeated', ids })
      answers.set(key, [...ids, `#${index + 1}`])
    }

    return { index, question: item.question, item, action: 'insert', issues }
  })

  return { fileError: null, items }
}

export function hasErrors(plan: ImportPlan): boolean {
  return (
    plan.fileError !== null ||
    plan.items.some((item) => item.issues.some((issue) => issue.level === 'error'))
  )
}

/** The questions an import would write. */
export function itemsToInsert(plan: ImportPlan): (PlannedItem & { item: ImportItem })[] {
  return plan.items.filter(
    (p): p is PlannedItem & { item: ImportItem } => p.action === 'insert' && p.item !== null,
  )
}

/** Today in Croatia as `YYYY-MM-DD`, the default `checkedAt`. */
export function todayInCroatia(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb' }).format(now)
}
