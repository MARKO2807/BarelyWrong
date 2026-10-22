import { describe, expect, it } from 'vitest'
import { GAME_LENGTHS, TOPICS } from './constants'
import { createSeededRng, randomInt, type Rng } from './random'
import type { Question } from './schema'
import {
  candidatesPerDifficulty,
  pickCandidates,
  roundKindOf,
  selectQuestions,
  type SelectionInput,
} from './select'
import { makePool, makeQuestion } from './testing/fixtures'

const groupKey = (q: Question) => `${roundKindOf(q)}:${q.difficulty}`

function countBy(questions: readonly Question[]) {
  const counts = new Map<string, number>()
  for (const q of questions) counts.set(groupKey(q), (counts.get(groupKey(q)) ?? 0) + 1)
  return counts
}

describe('candidatesPerDifficulty', () => {
  it('is two per team, but never fewer than four', () => {
    expect(candidatesPerDifficulty(2)).toBe(4)
    expect(candidatesPerDifficulty(3)).toBe(6)
    expect(candidatesPerDifficulty(4)).toBe(8)
  })
})

describe('pickCandidates', () => {
  const pool = makePool({ perTopic: 40, trueFalse: 40, estimate: 40 })

  it('takes at most the limit from every round kind and difficulty', () => {
    const candidates = pickCandidates(pool, new Set(), 4, createSeededRng(1))
    for (const count of countBy(candidates).values()) expect(count).toBeLessThanOrEqual(4)
    expect(new Set(candidates.map((q) => q.id)).size).toBe(candidates.length)
  })

  it('takes all of a group that is smaller than the limit', () => {
    const small = makePool({ perTopic: 2, trueFalse: 2, estimate: 2 })
    expect(pickCandidates(small, new Set(), 8, createSeededRng(1))).toHaveLength(small.length)
  })

  it('never takes played questions', () => {
    const played = new Set(pool.filter((_, i) => i % 3 === 0).map((q) => q.id))
    const candidates = pickCandidates(pool, played, 8, createSeededRng(2))
    for (const q of candidates) expect(played.has(q.id)).toBe(false)
  })

  it('picks different questions on different draws', () => {
    const ids = (seed: number) =>
      pickCandidates(pool, new Set(), 4, createSeededRng(seed))
        .map((q) => q.id)
        .sort()
    expect(ids(1)).not.toEqual(ids(2))
  })
})

/** A pool with random sizes and difficulties, so some kinds run short. */
function randomPool(rng: Rng): Question[] {
  const questions: Question[] = []
  const add = (topic: Question['topic'], format: Question['format'], count: number) => {
    for (let i = 0; i < count; i++) {
      questions.push(
        makeQuestion({
          id: `${topic}-${format}-${i}`,
          topic,
          format,
          difficulty: (1 + randomInt(rng, 3)) as Question['difficulty'],
        }),
      )
    }
  }
  for (const topic of TOPICS) {
    add(topic, 'open', randomInt(rng, 25))
    add(topic, 'true_false', randomInt(rng, 3))
    add(topic, 'estimate', randomInt(rng, 3))
  }
  return questions
}

describe('a game from the candidates', () => {
  it('works whenever a game from the whole pool works, and reports the same shortages', () => {
    const rng = createSeededRng(42)
    const outcomes = { games: 0, shortages: 0 }
    for (let i = 0; i < 400; i++) {
      const pool = randomPool(rng)
      const playedIds = new Set(pool.filter(() => rng() < 0.3).map((q) => q.id))
      const input: SelectionInput = {
        pool,
        playedIds,
        teamCount: 2 + randomInt(rng, 3),
        length: GAME_LENGTHS[randomInt(rng, 2)]!,
        fastestFinger: rng() < 0.5,
        rng: createSeededRng(i),
      }
      const candidates = pickCandidates(
        pool,
        playedIds,
        candidatesPerDifficulty(input.teamCount),
        createSeededRng(1000 + i),
      )
      const whole = selectQuestions(input)
      const fromCandidates = selectQuestions({ ...input, pool: candidates })
      expect(fromCandidates.ok).toBe(whole.ok)
      outcomes[whole.ok ? 'games' : 'shortages']++
      if (!whole.ok && !fromCandidates.ok) {
        expect(fromCandidates.shortages).toEqual(whole.shortages)
      }
    }
    // Both outcomes must come up, or the comparison proves little.
    expect(outcomes.games).toBeGreaterThan(50)
    expect(outcomes.shortages).toBeGreaterThan(50)
  })
})
