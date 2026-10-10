import type { QuestionFormat, Topic } from '../../engine'
import { matchKey } from './normalize'

// Overlaps that the similarity check misses because the questions are worded differently
// (spec 8.5): the same answer in another topic, or an answer that another question gives away.

/** A question to compare against: from the database or earlier in the same file. */
export interface OverlapEntry {
  id: string
  topic: Topic
  format: QuestionFormat
  question: string
  answer: string
  accept?: readonly string[]
  note?: string | null
}

export interface Overlaps {
  /** Open questions in other topics with the same answer. */
  sameAnswer: string[]
  /** Questions whose text or note contains this answer. */
  answerMentioned: string[]
  /** Open questions whose answer this question's text or note contains. */
  mentionsAnswer: string[]
}

/** Answers shorter than this (without spaces) are too common to compare. */
const MIN_LETTERS = 4
/** An answer mentioned in more questions than this is common knowledge, not a give-away. */
export const MAX_MENTIONS = 3
/** Croatian case endings: „Ahab” is found in „Ahaba”, „Carroll” in „Carrolla”. */
const MAX_ENDING = 2

const words = (text: string) => matchKey(text).split(' ').filter(Boolean)

/** The forms of an open answer worth comparing, as word lists. Numbers are left out. */
function answerForms(entry: Pick<OverlapEntry, 'format' | 'answer' | 'accept'>): string[][] {
  if (entry.format !== 'open') return []
  return [entry.answer, ...(entry.accept ?? [])]
    .map(words)
    .filter((w) => w.join('').length >= MIN_LETTERS && !/^\d/.test(w[0] ?? ''))
}

/** „Francuska” → „francusk”, so „Francuskoj” matches too. */
const stem = (word: string) => (word.length >= 6 ? word.replace(/[aeiou]$/, '') : word)

/** Whether the words of `form` appear in `text` in order, each allowing a case ending. */
function mentions(text: readonly string[], form: readonly string[]): boolean {
  const stems = form.map(stem)
  for (let start = 0; start + stems.length <= text.length; start++) {
    if (
      stems.every((word, i) => {
        const found = text[start + i]!
        return found.startsWith(word) && found.length - word.length <= MAX_ENDING
      })
    )
      return true
  }
  return false
}

type Indexed = ReturnType<typeof indexEntry>

/** How many questions in the index mention one of these answer forms. */
const mentionCount = (index: OverlapIndex, of: Indexed) =>
  index.entries.filter(
    (other) => other !== of && of.answer !== null && mentions(other.text, of.answer),
  ).length

/** Precomputed words, so a batch compares every question against every other only once. */
export interface OverlapIndex {
  entries: Indexed[]
}

export function overlapIndex(entries: readonly OverlapEntry[]): OverlapIndex {
  return { entries: entries.map(indexEntry) }
}

function indexEntry(entry: OverlapEntry) {
  const forms = answerForms(entry)
  return {
    entry,
    text: words(`${entry.question} ${entry.note ?? ''}`),
    // Only the main answer is looked for in texts: short accepted forms („Parker”) match too much.
    answer: forms[0] && forms[0].join(' ') === matchKey(entry.answer) ? forms[0] : null,
    keys: new Set(forms.map((w) => w.join(' '))),
  }
}

export function addToIndex(index: OverlapIndex, entry: OverlapEntry): void {
  index.entries.push(indexEntry(entry))
}

export function findOverlaps(item: OverlapEntry, index: OverlapIndex): Overlaps {
  const own = indexEntry(item)
  const sameAnswer: string[] = []
  const answerMentioned: string[] = []
  const mentionsAnswer: string[] = []

  for (const other of index.entries) {
    const shared = [...own.keys].some((key) => other.keys.has(key))
    // The same answer in the same topic is the answer limit's job (prepare.ts).
    if (shared) {
      if (other.entry.topic !== item.topic) sameAnswer.push(other.entry.id)
      continue
    }
    if (own.answer && mentions(other.text, own.answer)) answerMentioned.push(other.entry.id)
    if (
      other.answer &&
      mentions(own.text, other.answer) &&
      mentionCount(index, other) <= MAX_MENTIONS
    )
      mentionsAnswer.push(other.entry.id)
  }

  return {
    sameAnswer,
    answerMentioned: answerMentioned.length > MAX_MENTIONS ? [] : answerMentioned,
    mentionsAnswer,
  }
}
