import type { EditorQuestion, QuestionChanges, SimilarPair } from './editorApi'
import { normalizeText, prepareImport, type ExistingQuestion, type Issue } from './import'

// The import rules (src/data/import) applied to one question in the editor, against all others.

function toExisting(q: EditorQuestion): ExistingQuestion {
  return {
    id: q.id,
    topic: q.topic,
    format: q.format,
    status: q.status,
    question: q.question,
    answer: q.answer,
  }
}

/** What the edit form holds: lists as text, the way they are typed. */
export interface QuestionDraft {
  topic: EditorQuestion['topic']
  format: EditorQuestion['format']
  difficulty: EditorQuestion['difficulty']
  status: EditorQuestion['status']
  question: string
  answer: string
  /** One form per line. */
  accept: string
  note: string
  source: string
  /** Comma-separated. */
  tags: string
  timeSensitive: boolean
  checkedAt: string
  editorNote: string
}

export function toDraft(q: EditorQuestion): QuestionDraft {
  return {
    topic: q.topic,
    format: q.format,
    difficulty: q.difficulty,
    status: q.status,
    question: q.question,
    answer: q.answer,
    accept: q.accept.join('\n'),
    note: q.note ?? '',
    source: q.source ?? '',
    tags: q.tags.join(', '),
    timeSensitive: q.time_sensitive,
    checkedAt: q.checked_at ?? '',
    editorNote: q.editor_note ?? '',
  }
}

const lines = (text: string, separator: RegExp) =>
  text
    .split(separator)
    .map((part) => normalizeText(part))
    .filter(Boolean)
const optional = (text: string) => normalizeText(text) || null

/** Cleaned-up values to save, the same clean-up the import does. */
export function toChanges(draft: QuestionDraft): QuestionChanges {
  return {
    topic: draft.topic,
    format: draft.format,
    difficulty: draft.difficulty,
    status: draft.status,
    question: normalizeText(draft.question),
    answer: normalizeText(draft.answer),
    accept: lines(draft.accept, /\n/),
    note: optional(draft.note),
    source: optional(draft.source),
    tags: lines(draft.tags, /,/),
    time_sensitive: draft.timeSensitive,
    checked_at: draft.checkedAt || null,
    editor_note: optional(draft.editorNote),
  }
}

/** Writing rules and duplicates for a question as it would be saved. */
export function draftIssues(
  id: string,
  draft: QuestionDraft,
  all: readonly EditorQuestion[],
  today: string,
): Issue[] {
  const changes = toChanges(draft)
  const candidate = {
    topic: changes.topic,
    format: changes.format,
    difficulty: changes.difficulty,
    status: changes.status,
    question: changes.question,
    answer: changes.answer,
    accept: changes.accept,
    note: changes.note ?? undefined,
    source: changes.source ?? undefined,
    tags: changes.tags,
    timeSensitive: changes.time_sensitive,
  }
  const others = all.filter((q) => q.id !== id).map(toExisting)
  return prepareImport([candidate], others, today, { overlaps: false }).items[0]!.issues
}

export function questionIssues(
  q: EditorQuestion,
  all: readonly EditorQuestion[],
  today: string,
): Issue[] {
  return draftIssues(q.id, toDraft(q), all, today)
}

export const hasError = (issues: readonly Issue[]) => issues.some((i) => i.level === 'error')

/** Similar questions per id, most similar first. */
export function similarById(
  pairs: readonly SimilarPair[],
): Map<string, { id: string; similarity: number }[]> {
  const result = new Map<string, { id: string; similarity: number }[]>()
  const add = (id: string, other: string, similarity: number) =>
    result.set(id, [...(result.get(id) ?? []), { id: other, similarity }])
  for (const pair of pairs) {
    add(pair.id, pair.other_id, pair.similarity)
    add(pair.other_id, pair.id, pair.similarity)
  }
  for (const list of result.values()) list.sort((a, b) => b.similarity - a.similarity)
  return result
}

/** Share of correct answers in per cent, 0 when never played. */
export function correctRate(shown: number, correct: number): number {
  return shown === 0 ? 0 : Math.round((correct / shown) * 100)
}
