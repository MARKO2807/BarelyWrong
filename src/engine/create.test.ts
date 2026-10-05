import { describe, expect, it } from 'vitest'
import { createGame, createRematch } from './create'
import { createSeededRng } from './random'
import { gameStateSchema } from './schema'
import { TEST_OPTIONS, makePool, makeTeams, newGame } from './testing/fixtures'

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1)

describe('createGame', () => {
  it('starts at the first round announcement with no points', () => {
    const game = newGame()
    expect(game.step).toEqual({ type: 'roundIntro', round: 0 })
    expect(game.results).toEqual([])
    expect(gameStateSchema.safeParse(game).success).toBe(true)
  })

  it('has exactly one Double trouble round, never the first', () => {
    const doubledRounds = new Set<number>()
    for (const seed of SEEDS) {
      const game = newGame({ seed })
      const doubled = game.rounds.flatMap((round, index) => (round.doubled ? [index] : []))
      expect(doubled).toHaveLength(1)
      expect(doubled[0]).toBeGreaterThan(0)
      doubledRounds.add(doubled[0]!)
    }
    // Over many games it lands on every round except the first.
    expect([...doubledRounds].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it('places Najbrži prst between two rounds', () => {
    const slots = new Set<number>()
    for (const seed of SEEDS) {
      const game = newGame({ seed, options: { length: 'short' } })
      const afterRound = game.fastestFinger!.afterRound
      expect(afterRound).toBeGreaterThanOrEqual(0)
      expect(afterRound).toBeLessThan(game.rounds.length - 1)
      slots.add(afterRound)
    }
    expect([...slots].sort()).toEqual([0, 1, 2, 3, 4])
  })

  it('leaves Najbrži prst out when it is turned off', () => {
    expect(newGame({ options: { fastestFinger: false } }).fastestFinger).toBeNull()
  })

  it('gives each team one turn per round, each round starting with the next team', () => {
    for (const teamCount of [2, 3, 4]) {
      const game = newGame({ teams: teamCount, seed: teamCount })
      const order = game.teams.map((team) => team.id)
      const firstOfRound0 = order.indexOf(game.rounds[0]!.turns[0]!.teamId)
      game.rounds.forEach((round, r) => {
        expect(round.turns.map((turn) => turn.teamId)).toEqual(
          order.map((_, i) => order[(firstOfRound0 + r + i) % teamCount]),
        )
      })
    }
  })

  it('picks the starting team at random', () => {
    const starters = new Set(
      SEEDS.map((seed) => newGame({ seed, teams: 4 }).rounds[0]!.turns[0]!.teamId),
    )
    expect(starters).toEqual(new Set(['t1', 't2', 't3', 't4']))
  })

  it('stores exactly the questions the game uses', () => {
    const game = newGame()
    const used = [
      ...game.rounds.flatMap((round) => round.turns.map((turn) => turn.questionId)),
      game.fastestFinger!.questionId,
      game.tiebreakQuestionId,
    ]
    expect(Object.keys(game.questions).sort()).toEqual(used.sort())
  })

  it('tidies team names', () => {
    const teams = makeTeams(2).map((team) => ({ ...team, name: `  ${team.name}   ekipa ` }))
    const result = createGame({
      teams,
      options: TEST_OPTIONS,
      pool: makePool(),
      playedIds: new Set(),
      rng: createSeededRng(1),
    })
    expect(result.ok && result.game.teams.map((team) => team.name)).toEqual([
      'Tim 1 ekipa',
      'Tim 2 ekipa',
    ])
  })

  it('refuses an invalid setup', () => {
    const input = {
      options: TEST_OPTIONS,
      pool: makePool(),
      playedIds: new Set<string>(),
      rng: createSeededRng(1),
    }
    expect(() => createGame({ ...input, teams: makeTeams(1) })).toThrow(/teamCount/)
    const [a, b] = makeTeams(2)
    expect(() => createGame({ ...input, teams: [a!, { ...b!, id: a!.id }] })).toThrow(/team ids/)
  })

  it('passes shortages through', () => {
    const result = createGame({
      teams: makeTeams(3),
      options: TEST_OPTIONS,
      pool: makePool({ trueFalse: 0 }),
      playedIds: new Set(),
      rng: createSeededRng(1),
    })
    expect(result).toEqual({
      ok: false,
      shortages: [{ kind: 'true_false', needed: 3, available: 0 }],
    })
  })
})

describe('createRematch', () => {
  it('keeps teams and options and brings new questions', () => {
    const first = newGame({ teams: 2 })
    const played = new Set(Object.keys(first.questions))
    const result = createRematch(first, {
      pool: makePool(),
      playedIds: played,
      rng: createSeededRng(2),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.game.teams).toEqual(first.teams)
    expect(result.game.options).toEqual(first.options)
    expect(Object.keys(result.game.questions).filter((id) => played.has(id))).toEqual([])
  })
})
