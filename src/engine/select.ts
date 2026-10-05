import {
  ROUND_KINDS,
  ROUNDS_PER_GAME,
  TIEBREAK_QUESTIONS,
  type GameLength,
  type RoundKind,
} from './constants'
import { pickOne, shuffle, type Rng } from './random'
import type { Question } from './schema'

/** What ran out: a round kind, or the open question for Najbrži prst. */
export type ShortageKind = RoundKind | 'fastest_finger'

/** `needed` is per game; `available` is how many unplayed questions of that kind can be used. */
export interface Shortage {
  kind: ShortageKind
  needed: number
  available: number
}

export interface QuestionPlan {
  rounds: { kind: RoundKind; questionIds: string[] }[]
  fastestFingerQuestionId: string | null
  tiebreakQuestionId: string
}

export type SelectionResult =
  { ok: true; plan: QuestionPlan } | { ok: false; shortages: Shortage[] }

export interface SelectionInput {
  /** All approved questions. */
  pool: readonly Question[]
  /** Questions already played on this device; never picked. */
  playedIds: ReadonlySet<string>
  teamCount: number
  length: GameLength
  fastestFinger: boolean
  rng: Rng
}

/** Which questions can be used for a kind; also tells the app which played ones to bring back. */
export function questionFitsKind(question: Question, kind: ShortageKind): boolean {
  if (kind === 'true_false' || kind === 'estimate') return question.format === kind
  if (kind === 'fastest_finger') return question.format === 'open'
  return question.format === 'open' && question.topic === kind
}

// Difficulties in one round differ by at most one step: easy+medium or medium+hard.
const DIFFICULTY_BANDS = [
  [1, 2],
  [2, 3],
] as const

function bands(questions: readonly Question[]): Question[][] {
  return DIFFICULTY_BANDS.map((band) =>
    questions.filter((q) => (band as readonly number[]).includes(q.difficulty)),
  )
}

/** How many questions of a kind one round could take, keeping the tiebreak question aside. */
function usableForRound(kind: RoundKind, questions: readonly Question[]): number {
  const widestBand = Math.max(...bands(questions).map((band) => band.length))
  const reserved = kind === 'estimate' ? TIEBREAK_QUESTIONS : 0
  return Math.max(0, Math.min(widestBand, questions.length - reserved))
}

/** Prefers questions from topics not yet picked, so mixed rounds cover more ground. */
function pickVaried(rng: Rng, candidates: readonly Question[], count: number): Question[] {
  const shuffled = shuffle(rng, candidates)
  const picked: Question[] = []
  const topics = new Set<string>()
  for (const question of shuffled) {
    if (picked.length < count && !topics.has(question.topic)) {
      picked.push(question)
      topics.add(question.topic)
    }
  }
  for (const question of shuffled) {
    if (picked.length < count && !picked.includes(question)) picked.push(question)
  }
  return picked
}

function pickRound(rng: Rng, candidates: readonly Question[], count: number): Question[] {
  const band = pickOne(
    rng,
    bands(candidates).filter((b) => b.length >= count),
  )
  return pickVaried(rng, band, count)
}

/**
 * Picks every question for a game up front: one per team in each round, one open question for
 * Najbrži prst and one estimate question for a tie. Played questions are skipped and nothing
 * repeats. When a kind runs out, returns the shortages instead so the app can offer to bring
 * played questions of that kind back.
 */
export function selectQuestions(input: SelectionInput): SelectionResult {
  const { pool, playedIds, teamCount, length, fastestFinger, rng } = input
  const unique = new Map(pool.map((q) => [q.id, q]))
  const available = [...unique.values()].filter((q) => !playedIds.has(q.id))
  const byKind = new Map(
    ROUND_KINDS.map((kind) => [kind, available.filter((q) => questionFitsKind(q, kind))]),
  )
  const questionsFor = (kind: RoundKind) => byKind.get(kind) ?? []
  const fits = (kind: RoundKind) => usableForRound(kind, questionsFor(kind)) >= teamCount
  const shortageFor = (kind: RoundKind): Shortage => ({
    kind,
    needed: teamCount,
    available: usableForRound(kind, questionsFor(kind)),
  })

  // A full game plays every kind; a short one picks among kinds that still have questions.
  const roundCount = ROUNDS_PER_GAME[length]
  const usableKinds = ROUND_KINDS.filter(fits)
  const mustPlayAll = roundCount >= ROUND_KINDS.length
  if (mustPlayAll ? usableKinds.length < ROUND_KINDS.length : usableKinds.length < roundCount) {
    return { ok: false, shortages: ROUND_KINDS.filter((kind) => !fits(kind)).map(shortageFor) }
  }
  const kinds = shuffle(rng, usableKinds).slice(0, roundCount)

  const used = new Set<string>()
  const rounds = kinds.map((kind) => {
    const questionIds = pickRound(rng, questionsFor(kind), teamCount).map((q) => q.id)
    questionIds.forEach((questionId) => used.add(questionId))
    return { kind, questionIds }
  })

  const shortages: Shortage[] = []
  const tiebreakCandidates = questionsFor('estimate').filter((q) => !used.has(q.id))
  if (tiebreakCandidates.length === 0) {
    shortages.push({ kind: 'estimate', needed: TIEBREAK_QUESTIONS, available: 0 })
  }

  let fastestFingerQuestionId: string | null = null
  if (fastestFinger) {
    const open = available.filter((q) => q.format === 'open' && !used.has(q.id))
    if (open.length === 0) {
      shortages.push({ kind: 'fastest_finger', needed: 1, available: 0 })
    } else {
      // Random topic first, so a topic with many questions isn't favoured.
      const topic = pickOne(rng, [...new Set(open.map((q) => q.topic))])
      fastestFingerQuestionId = pickOne(
        rng,
        open.filter((q) => q.topic === topic),
      ).id
    }
  }

  if (shortages.length > 0) return { ok: false, shortages }
  return {
    ok: true,
    plan: {
      rounds,
      fastestFingerQuestionId,
      tiebreakQuestionId: pickOne(rng, tiebreakCandidates).id,
    },
  }
}
