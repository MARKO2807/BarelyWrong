import { describe, expect, it } from 'vitest'
import { ROUND_KINDS, ROUNDS_PER_GAME, TOPICS, type GameLength } from './constants'
import { createSeededRng } from './random'
import type { Question } from './schema'
import { questionFitsKind, selectQuestions, type SelectionInput } from './select'
import { makePool, makeQuestion } from './testing/fixtures'

function select(overrides: Partial<SelectionInput> = {}) {
  return selectQuestions({
    pool: makePool(),
    playedIds: new Set(),
    teamCount: 3,
    length: 'full',
    fastestFinger: true,
    rng: createSeededRng(1),
    ...overrides,
  })
}

function plan(overrides: Partial<SelectionInput> = {}) {
  const result = select(overrides)
  if (!result.ok) throw new Error(`Unexpected shortage: ${JSON.stringify(result.shortages)}`)
  return result.plan
}

/** Checks every rule a selection must follow. */
function expectValidPlan(
  input: Pick<SelectionInput, 'pool' | 'playedIds' | 'teamCount' | 'length' | 'fastestFinger'>,
  seed: number,
) {
  const result = plan({ ...input, rng: createSeededRng(seed) })
  const byId = new Map(input.pool.map((q) => [q.id, q]))

  const kinds = result.rounds.map((round) => round.kind)
  expect(kinds).toHaveLength(ROUNDS_PER_GAME[input.length])
  expect(new Set(kinds).size).toBe(kinds.length)

  for (const round of result.rounds) {
    expect(round.questionIds).toHaveLength(input.teamCount)
    const questions = round.questionIds.map((id) => byId.get(id)!)
    for (const question of questions) expect(questionFitsKind(question, round.kind)).toBe(true)
    const difficulties = questions.map((q) => q.difficulty)
    expect(Math.max(...difficulties) - Math.min(...difficulties)).toBeLessThanOrEqual(1)
  }

  const allIds = [
    ...result.rounds.flatMap((round) => round.questionIds),
    result.tiebreakQuestionId,
    ...(result.fastestFingerQuestionId ? [result.fastestFingerQuestionId] : []),
  ]
  expect(new Set(allIds).size).toBe(allIds.length)
  for (const id of allIds) expect(input.playedIds.has(id)).toBe(false)

  expect(byId.get(result.tiebreakQuestionId)!.format).toBe('estimate')
  if (input.fastestFinger) {
    expect(byId.get(result.fastestFingerQuestionId!)!.format).toBe('open')
  } else {
    expect(result.fastestFingerQuestionId).toBeNull()
  }
}

describe('selectQuestions', () => {
  it('plays all 12 round kinds once in a full game', () => {
    const result = plan()
    expect(result.rounds.map((r) => r.kind).sort()).toEqual([...ROUND_KINDS].sort())
  })

  it('plays 6 different round kinds in a short game', () => {
    const result = plan({ length: 'short' })
    const kinds = result.rounds.map((r) => r.kind)
    expect(kinds).toHaveLength(6)
    expect(new Set(kinds).size).toBe(6)
  })

  it('follows every rule across hundreds of random games', () => {
    const pool = makePool()
    const playedIds = new Set(['sport-0', 'tf-1', 'est-2', 'music-5'])
    for (let seed = 1; seed <= 300; seed++) {
      const teamCount = 2 + (seed % 3)
      const length: GameLength = seed % 2 === 0 ? 'full' : 'short'
      expectValidPlan({ pool, playedIds, teamCount, length, fastestFinger: seed % 5 !== 0 }, seed)
    }
  })

  it('varies the order of rounds between games', () => {
    const orders = new Set(
      [1, 2, 3, 4, 5].map((seed) =>
        plan({ rng: createSeededRng(seed) })
          .rounds.map((r) => r.kind)
          .join(),
      ),
    )
    expect(orders.size).toBeGreaterThan(1)
  })

  it('never picks played questions', () => {
    const sport = ['s0', 's1', 's2', 's3'].map((id) =>
      makeQuestion({ id, topic: 'sport', format: 'open' }),
    )
    const pool = [
      ...makePool().filter((q) => !(q.topic === 'sport' && q.format === 'open')),
      ...sport,
    ]
    expect(select({ pool, teamCount: 4 }).ok).toBe(true)
    const result = select({ pool, playedIds: new Set(['s0']), teamCount: 4 })
    expect(result).toEqual({
      ok: false,
      shortages: [{ kind: 'sport', needed: 4, available: 3 }],
    })
  })

  it('never mixes easy and hard questions in one round', () => {
    const music = (id: string, difficulty: 1 | 3) =>
      makeQuestion({ id, topic: 'music', format: 'open', difficulty })
    const pool = [
      ...makePool().filter((q) => !(q.topic === 'music' && q.format === 'open')),
      music('m1', 1),
      music('m2', 1),
      music('m3', 3),
      music('m4', 3),
    ]
    const result = select({ pool, teamCount: 3 })
    expect(result).toEqual({
      ok: false,
      shortages: [{ kind: 'music', needed: 3, available: 2 }],
    })
  })

  it('keeps an estimate question aside for a tie', () => {
    const pool = makePool({ estimate: 3 }).map((q) => ({ ...q, difficulty: 2 as const }))
    expect(select({ pool, teamCount: 3 })).toEqual({
      ok: false,
      shortages: [{ kind: 'estimate', needed: 3, available: 2 }],
    })
    expect(
      select({
        pool: [...pool, makeQuestion({ id: 'est-x', topic: 'sport', format: 'estimate' })],
        teamCount: 3,
      }).ok,
    ).toBe(true)
  })

  it('in a short game skips kinds that ran out', () => {
    const pool = makePool().filter((q) => q.topic !== 'history' && q.topic !== 'culture')
    for (let seed = 1; seed <= 50; seed++) {
      const kinds = plan({ pool, length: 'short', rng: createSeededRng(seed) }).rounds.map(
        (r) => r.kind,
      )
      expect(kinds).not.toContain('history')
      expect(kinds).not.toContain('culture')
    }
  })

  it('in a full game lists every kind that ran out', () => {
    const pool = makePool().filter((q) => q.topic !== 'history' && q.topic !== 'culture')
    const result = select({ pool })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.shortages.map((s) => s.kind)).toEqual(['history', 'culture'])
    }
  })

  it('in a short game without estimates still needs one for a tie', () => {
    const pool = makePool({ estimate: 0 })
    expect(select({ pool, length: 'short' })).toEqual({
      ok: false,
      shortages: [{ kind: 'estimate', needed: 1, available: 0 }],
    })
  })

  it('reports when no open question is left for Najbrži prst', () => {
    const pool = makePool({ perTopic: 3 }).map((q) => ({ ...q, difficulty: 2 as const }))
    expect(select({ pool, teamCount: 3 })).toEqual({
      ok: false,
      shortages: [{ kind: 'fastest_finger', needed: 1, available: 0 }],
    })
    expect(select({ pool, teamCount: 3, fastestFinger: false }).ok).toBe(true)
  })

  it('mixes topics in true/false and estimate rounds when it can', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const result = plan({ teamCount: 4, rng: createSeededRng(seed) })
      const pool = new Map(makePool().map((q) => [q.id, q]))
      for (const round of result.rounds.filter(
        (r) => r.kind === 'true_false' || r.kind === 'estimate',
      )) {
        const topics = round.questionIds.map((id) => pool.get(id)!.topic)
        expect(new Set(topics).size).toBe(topics.length)
      }
    }
  })

  it('ignores questions listed twice', () => {
    const pool = makePool()
    const result = plan({ pool: [...pool, ...pool] })
    const ids = result.rounds.flatMap((r) => r.questionIds)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('questionFitsKind', () => {
  const open = makeQuestion({ id: 'a', topic: 'nature', format: 'open' })
  const trueFalse = makeQuestion({ id: 'b', topic: 'nature', format: 'true_false' })
  const estimate: Question = makeQuestion({ id: 'c', topic: 'nature', format: 'estimate' })

  it('matches topic rounds to open questions of that topic', () => {
    expect(questionFitsKind(open, 'nature')).toBe(true)
    expect(questionFitsKind(open, 'sport')).toBe(false)
    expect(questionFitsKind(trueFalse, 'nature')).toBe(false)
  })

  it('matches format rounds to questions of that format from any topic', () => {
    expect(questionFitsKind(trueFalse, 'true_false')).toBe(true)
    expect(questionFitsKind(estimate, 'estimate')).toBe(true)
    expect(questionFitsKind(estimate, 'true_false')).toBe(false)
  })

  it('takes any open question for Najbrži prst', () => {
    expect(questionFitsKind(open, 'fastest_finger')).toBe(true)
    expect(questionFitsKind(trueFalse, 'fastest_finger')).toBe(false)
  })

  it('covers all ten topics', () => {
    expect(TOPICS).toHaveLength(10)
  })
})
