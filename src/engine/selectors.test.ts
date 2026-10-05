import { describe, expect, it } from 'vitest'
import type { GameAction } from './reducer'
import {
  canUndo,
  getActiveQuestion,
  getOutcome,
  getProgress,
  getRankingAfterRound,
  getScoresByColumn,
  getTopTiedTeamIds,
  rankTeams,
} from './selectors'
import { NOW, makeTeams, newGame, playUntil, run, withScores } from './testing/fixtures'

describe('rankTeams', () => {
  const teams = makeTeams(4)

  it('shares ranks between tied teams (1, 1, 3)', () => {
    expect(rankTeams(teams, { t1: 2, t2: 5, t3: 5, t4: 0 })).toEqual([
      { teamId: 't2', score: 5, rank: 1 },
      { teamId: 't3', score: 5, rank: 1 },
      { teamId: 't1', score: 2, rank: 3 },
      { teamId: 't4', score: 0, rank: 4 },
    ])
  })

  it('puts a tiebreak winner ahead of the teams it tied with', () => {
    expect(rankTeams(teams, { t1: 2, t2: 5, t3: 5, t4: 0 }, 't3').slice(0, 2)).toEqual([
      { teamId: 't3', score: 5, rank: 1 },
      { teamId: 't2', score: 5, rank: 2 },
    ])
  })

  it('handles negative totals', () => {
    expect(rankTeams(makeTeams(2), { t1: -1, t2: 0 }).map((t) => t.teamId)).toEqual(['t2', 't1'])
  })
})

describe('scores', () => {
  const game = playUntil(newGame(), 'fastestFingerJudged')

  it('lists points per round kind, with Najbrži prst in its own column', () => {
    const table = getScoresByColumn(game)
    const firstKind = game.rounds[0]!.kind
    const firstScorer = game.rounds[0]!.turns[0]!.teamId
    expect(table[firstScorer]![firstKind]).toBeGreaterThan(0)
    expect(table.t1!.fastest_finger).toBe(2)
    expect(table.t2!.fastest_finger).toBeUndefined()
  })

  it('shows standings as they were after each round', () => {
    const ffRound = game.fastestFinger!.afterRound
    const withoutFf = getRankingAfterRound(game, ffRound)
    const t1Before = withoutFf.find((t) => t.teamId === 't1')!.score
    const nextRound = playUntil(
      game,
      (g) => g.step.type === 'leaderboard' && g.step.round === ffRound + 1,
    )
    const t1After = getRankingAfterRound(nextRound, ffRound + 1).find(
      (t) => t.teamId === 't1',
    )!.score
    const t1RoundPoints = nextRound.results
      .filter((r) => r.type !== 'fastestFinger' && r.round === ffRound + 1 && r.teamId === 't1')
      .reduce((sum, r) => sum + r.points, 0)
    expect(t1After).toBe(t1Before + 2 + t1RoundPoints)
  })
})

describe('getTopTiedTeamIds', () => {
  it('lists teams sharing first place, or nothing for a single leader', () => {
    const game = newGame()
    expect(getTopTiedTeamIds(withScores(game, { t1: 3, t2: 3, t3: 1 }))).toEqual(['t1', 't2'])
    expect(getTopTiedTeamIds(withScores(game, { t1: 3, t2: 2, t3: 2 }))).toEqual([])
  })
})

describe('what is on screen', () => {
  const game = newGame()

  it('hides the question during announcements', () => {
    expect(getActiveQuestion(game)).toBeNull()
    expect(getActiveQuestion(run(game, { type: 'next' }))).toBeNull()
    const question = run(game, { type: 'next' }, { type: 'start', now: NOW })
    expect(getActiveQuestion(question)!.id).toBe(game.rounds[0]!.turns[0]!.questionId)
    expect(getActiveQuestion(playUntil(game, 'fastestFingerIntro'))).toBeNull()
  })

  it('shows round progress like 3/12', () => {
    expect(getProgress(game)).toEqual({ round: 1, total: 12 })
    expect(getProgress(playUntil(game, 'fastestFingerIntro'))).toBeNull()
  })

  it('knows when Poništi is available', () => {
    const answer = run(game, { type: 'next' }, { type: 'start', now: NOW }, { type: 'reveal' })
    expect(canUndo(answer)).toBe(false)
    const judged = run(answer, { type: 'judge', correct: true })
    expect(canUndo(judged)).toBe(true)
    expect(canUndo(run(judged, { type: 'next' }))).toBe(false)
    const buzz: GameAction = { type: 'buzz', teamId: 't1', now: NOW + 1 }
    expect(canUndo(run(playUntil(game, 'fastestFingerQuestion'), buzz))).toBe(true)
  })

  it('has an outcome only when the game is finished', () => {
    expect(getOutcome(game)).toBeNull()
  })
})
