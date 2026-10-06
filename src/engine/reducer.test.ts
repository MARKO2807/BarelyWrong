import { describe, expect, it } from 'vitest'
import { gameReducer, type GameAction } from './reducer'
import { gameStateSchema, type GameState } from './schema'
import { getCurrentTurn, getOutcome, getScores } from './selectors'
import {
  NOW,
  findGame,
  newGame,
  nextAction,
  playToEnd,
  playToRound,
  playUntil,
  run,
  withScores,
} from './testing/fixtures'
import { remainingMs } from './timer'

const start: GameAction = { type: 'start', now: NOW }
const reveal: GameAction = { type: 'reveal' }
const next: GameAction = { type: 'next' }
const right: GameAction = { type: 'judge', correct: true }
const wrong: GameAction = { type: 'judge', correct: false }

/** A game whose first round is an open-question topic round. */
function topicFirst(options: Parameters<typeof newGame>[0] = {}) {
  return findGame(
    (g) => g.rounds[0]!.kind !== 'estimate' && g.rounds[0]!.kind !== 'true_false',
    options,
  )
}

function estimateRound(game: GameState): number {
  return game.rounds.findIndex((round) => round.kind === 'estimate')
}

describe('a turn', () => {
  it('goes announcement → question → answer → judged → next team', () => {
    let game = run(topicFirst(), next)
    expect(game.step).toEqual({ type: 'turnIntro', round: 0, turn: 0 })

    game = run(game, start)
    expect(game.step).toEqual({
      type: 'question',
      round: 0,
      turn: 0,
      timer: { durationMs: 60_000, elapsedMs: 0, runningSince: NOW },
    })

    game = run(game, reveal)
    expect(game.step).toEqual({ type: 'answer', round: 0, turn: 0 })

    game = run(game, right)
    expect(game.step).toEqual({ type: 'judged', round: 0, turn: 0 })
    const teamId = game.rounds[0]!.turns[0]!.teamId
    expect(game.results).toEqual([
      expect.objectContaining({ type: 'turn', teamId, correct: true, points: 1 }),
    ])

    game = run(game, next)
    expect(game.step).toEqual({ type: 'turnIntro', round: 0, turn: 1 })
  })

  it('records a wrong answer with no points', () => {
    const game = run(topicFirst(), next, start, reveal, wrong)
    expect(game.results).toEqual([expect.objectContaining({ correct: false, points: 0 })])
  })

  it('uses the chosen time per question', () => {
    const game = run(topicFirst({ options: { secondsPerQuestion: 90 } }), next, start)
    expect(game.step.type === 'question' && game.step.timer.durationMs).toBe(90_000)
  })

  it('shows the leaderboard after the last team of a round', () => {
    const game = playUntil(newGame({ teams: 2 }), 'leaderboard')
    expect(game.step).toEqual({ type: 'leaderboard', round: 0 })
    expect(game.results).toHaveLength(2)
  })

  it('ignores actions that do not fit the step', () => {
    const game = newGame()
    for (const action of [start, reveal, right, wrong, { type: 'undo', now: NOW } as const]) {
      expect(gameReducer(game, action)).toBe(game)
    }
    const question = run(topicFirst(), next, start)
    expect(gameReducer(question, next)).toBe(question)
    expect(gameReducer(question, right)).toBe(question)
    const answer = run(question, reveal)
    expect(gameReducer(answer, { type: 'award', teamId: 't1' })).toBe(answer)
  })
})

describe('timer', () => {
  it('pauses and resumes', () => {
    let game = run(topicFirst(), next, start, { type: 'pause', now: NOW + 10_000 })
    const timer = () => (game.step.type === 'question' ? game.step.timer : null)!
    expect(remainingMs(timer(), NOW + 99_000)).toBe(50_000)

    game = run(game, { type: 'resume', now: NOW + 20_000 })
    expect(remainingMs(timer(), NOW + 25_000)).toBe(45_000)
    expect(remainingMs(timer(), NOW + 999_000)).toBe(0)
  })

  it('can reveal while paused', () => {
    const game = run(topicFirst(), next, start, { type: 'pause', now: NOW + 1000 }, reveal)
    expect(game.step.type).toBe('answer')
  })
})

describe('Double trouble', () => {
  it('doubles points in its round', () => {
    const base = findGame((g) => {
      const kind = g.rounds.find((r) => r.doubled)!.kind
      return kind !== 'estimate'
    })
    const doubled = base.rounds.findIndex((round) => round.doubled)
    const game = run(playToRound(base, doubled), next, start, reveal, right)
    expect(game.results.at(-1)!.points).toBe(2)
  })

  it('doubles the estimate point too', () => {
    const base = findGame((g) => g.rounds.find((r) => r.doubled)!.kind === 'estimate')
    const game = run(playToRound(base, estimateRound(base)), next, start, reveal, {
      type: 'award',
      teamId: base.rounds[estimateRound(base)]!.turns[0]!.teamId,
    })
    expect(game.results.at(-1)).toEqual(expect.objectContaining({ type: 'estimate', points: 2 }))
  })
})

describe('estimate round', () => {
  const base = findGame((g) => {
    const index = g.rounds.findIndex((r) => r.kind === 'estimate')
    return !g.rounds[index]!.doubled
  })
  const answer = run(playToRound(base, estimateRound(base)), next, start, reveal)

  it('lets the next team in order say higher or lower', () => {
    const turn = getCurrentTurn(answer)!
    const order = base.teams.map((team) => team.id)
    expect(turn.challenger!.id).toBe(order[(order.indexOf(turn.team.id) + 1) % order.length])
  })

  it('gives the point only to the estimating team or the challenger', () => {
    const turn = getCurrentTurn(answer)!
    const outsider = base.teams.find((t) => t.id !== turn.team.id && t.id !== turn.challenger!.id)!
    expect(gameReducer(answer, { type: 'award', teamId: outsider.id })).toBe(answer)
    expect(gameReducer(answer, right)).toBe(answer)

    for (const winner of [turn.team, turn.challenger!]) {
      const judged = run(answer, { type: 'award', teamId: winner.id })
      expect(judged.results.at(-1)).toEqual(
        expect.objectContaining({ type: 'estimate', teamId: winner.id, points: 1 }),
      )
    }
  })

  it('wraps around: the last team is challenged by the first', () => {
    const lastTurn = playUntil(
      answer,
      (g) => g.step.type === 'answer' && g.step.turn === base.teams.length - 1,
    )
    const turn = getCurrentTurn(lastTurn)!
    const order = base.teams.map((team) => team.id)
    expect(order.indexOf(turn.challenger!.id)).toBe(
      (order.indexOf(turn.team.id) + 1) % order.length,
    )
  })
})

describe('Najbrži prst', () => {
  const base = newGame({ options: { secondsPerQuestion: 90 } })
  const after = base.fastestFinger!.afterRound
  const intro = playUntil(base, 'fastestFingerIntro')
  const question = run(intro, start)

  it('comes after the leaderboard of its round', () => {
    const leaderboard = playUntil(
      base,
      (g) => g.step.type === 'leaderboard' && g.step.round === after,
    )
    expect(run(leaderboard, next).step).toEqual({ type: 'fastestFingerIntro' })
  })

  it('always has 30 seconds', () => {
    expect(question.step.type === 'fastestFingerQuestion' && question.step.timer.durationMs).toBe(
      30_000,
    )
  })

  it('stops the clock for the team that raised its hand first', () => {
    const buzzed = run(question, { type: 'buzz', teamId: 't2', now: NOW + 5000 })
    expect(buzzed.step).toEqual({
      type: 'fastestFingerBuzzed',
      teamId: 't2',
      timer: { durationMs: 30_000, elapsedMs: 5000, runningSince: null },
    })
  })

  it('gives +2 for a right answer and −1 for a wrong one, never doubled', () => {
    const buzzed = run(question, { type: 'buzz', teamId: 't2', now: NOW + 5000 }, reveal)
    expect(buzzed.step).toEqual({ type: 'fastestFingerAnswer', teamId: 't2' })
    expect(run(buzzed, right).results.at(-1)).toEqual(
      expect.objectContaining({ type: 'fastestFinger', teamId: 't2', correct: true, points: 2 }),
    )
    expect(run(buzzed, wrong).results.at(-1)).toEqual(
      expect.objectContaining({ type: 'fastestFinger', teamId: 't2', correct: false, points: -1 }),
    )
  })

  it('can take a team below zero', () => {
    // t1 never scores before Najbrži prst, then answers it wrong.
    const game = playUntil(base, 'fastestFingerJudged', {
      correct: () => false,
      estimateWinner: (g) => {
        const turn = getCurrentTurn(g)!
        return turn.team.id === 't1' ? turn.challenger!.id : turn.team.id
      },
      buzzer: () => 't1',
      buzzerCorrect: () => false,
    })
    expect(getScores(game).t1).toBe(-1)
  })

  it('gives nobody points when no hand goes up', () => {
    const answer = run(question, reveal)
    expect(answer.step).toEqual({ type: 'fastestFingerAnswer', teamId: null })
    expect(gameReducer(answer, right)).toBe(answer)
    const nextRound = run(answer, next)
    expect(nextRound.step).toEqual({ type: 'roundIntro', round: after + 1 })
    expect(nextRound.results.some((r) => r.type === 'fastestFinger')).toBe(false)
  })

  it('ignores a hand raised after time is up or by an unknown team', () => {
    expect(gameReducer(question, { type: 'buzz', teamId: 't1', now: NOW + 30_000 })).toBe(question)
    expect(gameReducer(question, { type: 'buzz', teamId: 'nobody', now: NOW + 1000 })).toBe(
      question,
    )
  })

  it('continues with the next round', () => {
    const judged = run(question, { type: 'buzz', teamId: 't1', now: NOW + 1000 }, reveal, right)
    expect(run(judged, next).step).toEqual({ type: 'roundIntro', round: after + 1 })
  })
})

describe('Poništi', () => {
  const undo: GameAction = { type: 'undo', now: NOW + 9000 }

  it('takes back a judgement before moving on', () => {
    const judged = run(topicFirst(), next, start, reveal, right)
    const undone = run(judged, undo)
    expect(undone.step).toEqual({ type: 'answer', round: 0, turn: 0 })
    expect(undone.results).toEqual([])
    expect(run(undone, wrong).results).toEqual([expect.objectContaining({ correct: false })])
  })

  it('stops working once the game moves on', () => {
    const moved = run(topicFirst(), next, start, reveal, right, next)
    expect(gameReducer(moved, undo)).toBe(moved)
  })

  it('takes back a Najbrži prst judgement', () => {
    const judged = run(
      playUntil(newGame(), 'fastestFingerQuestion'),
      { type: 'buzz', teamId: 't3', now: NOW + 1000 },
      reveal,
      wrong,
    )
    const undone = run(judged, undo)
    expect(undone.step).toEqual({ type: 'fastestFingerAnswer', teamId: 't3' })
    expect(undone.results.some((r) => r.type === 'fastestFinger')).toBe(false)
  })

  it('takes back the wrong team and lets the clock run on', () => {
    const buzzed = run(playUntil(newGame(), 'fastestFingerQuestion'), {
      type: 'buzz',
      teamId: 't3',
      now: NOW + 5000,
    })
    const undone = run(buzzed, undo)
    expect(undone.step.type).toBe('fastestFingerQuestion')
    if (undone.step.type === 'fastestFingerQuestion') {
      expect(remainingMs(undone.step.timer, NOW + 10_000)).toBe(24_000)
    }
  })
})

describe('end of the game', () => {
  const lastLeaderboard = (teams = 3) => {
    const game = newGame({ teams })
    return playUntil(
      game,
      (g) => g.step.type === 'leaderboard' && g.step.round === game.rounds.length - 1,
    )
  }

  it('ends with a single leader', () => {
    const game = run(withScores(lastLeaderboard(), { t1: 9, t2: 5, t3: 5 }), next)
    expect(game.step).toEqual({ type: 'finished' })
    expect(getOutcome(game)).toEqual({
      winnerId: 't1',
      ranking: [
        { teamId: 't1', score: 9, rank: 1 },
        { teamId: 't2', score: 5, rank: 2 },
        { teamId: 't3', score: 5, rank: 2 },
      ],
      lastPlaceTeamIds: ['t2', 't3'],
    })
  })

  it('plays one estimate question when teams tie for first', () => {
    const tied = run(withScores(lastLeaderboard(), { t1: 7, t2: 4, t3: 7 }), next)
    expect(tied.step).toEqual({ type: 'tiebreakIntro' })
    expect(tied.tiebreak).toEqual({ teamIds: ['t1', 't3'], winnerId: null })

    const answer = run(tied, start, reveal)
    expect(answer.step).toEqual({ type: 'tiebreakAnswer' })
    expect(answer.questions[answer.tiebreakQuestionId]!.format).toBe('estimate')

    // Only a tied team can win, and there is always exactly one winner.
    expect(gameReducer(answer, { type: 'award', teamId: 't2' })).toBe(answer)
    const finished = run(answer, { type: 'award', teamId: 't3' })
    expect(finished.step).toEqual({ type: 'finished' })
    expect(getScores(finished)).toEqual(getScores(tied))
    expect(getOutcome(finished)).toEqual({
      winnerId: 't3',
      ranking: [
        { teamId: 't3', score: 7, rank: 1 },
        { teamId: 't1', score: 7, rank: 2 },
        { teamId: 't2', score: 4, rank: 3 },
      ],
      lastPlaceTeamIds: ['t2'],
    })
  })

  it('lets the host take back the tiebreak winner', () => {
    const finished = run(withScores(lastLeaderboard(2), { t1: 3, t2: 3 }), next, start, reveal, {
      type: 'award',
      teamId: 't1',
    })
    expect(getOutcome(finished)!.lastPlaceTeamIds).toEqual(['t2'])
    const undone = run(finished, { type: 'undo', now: NOW })
    expect(undone.step).toEqual({ type: 'tiebreakAnswer' })
    expect(undone.tiebreak!.winnerId).toBeNull()
  })

  it('does not break a tie below first place', () => {
    const game = run(withScores(lastLeaderboard(4), { t1: 9, t2: 3, t3: 3, t4: 1 }), next)
    expect(game.step).toEqual({ type: 'finished' })
    expect(game.tiebreak).toBeNull()
  })
})

describe('a whole game', () => {
  it.each([
    { teams: 2, length: 'full' },
    { teams: 4, length: 'full' },
    { teams: 3, length: 'short' },
  ] as const)('plays to the end with $teams teams ($length)', ({ teams, length }) => {
    let game = newGame({ teams, options: { length } })
    let steps = 0
    for (let action = nextAction(game); action; action = nextAction(game)) {
      game = gameReducer(game, action)
      expect(gameStateSchema.safeParse(game).success).toBe(true)
      steps++
    }
    expect(game.step.type).toBe('finished')
    expect(game.results).toHaveLength(game.rounds.length * teams + 1)
    expect(game.committedResults).toBe(game.results.length)
    expect(steps).toBeGreaterThan(game.rounds.length * teams * 4)
  })

  it('every team ends up with the points it earned', () => {
    // Only t1 answers correctly; estimates go to the estimating team; nobody takes Najbrži prst.
    const game = playToEnd(newGame({ teams: 2 }), {
      correct: (g) => getCurrentTurn(g)!.team.id === 't1',
      buzzer: () => null,
    })
    const expected = { t1: 0, t2: 0 }
    for (const round of game.rounds) {
      for (const turn of round.turns) {
        if (round.kind === 'estimate' || turn.teamId === 't1') {
          expected[turn.teamId as 't1' | 't2'] += round.doubled ? 2 : 1
        }
      }
    }
    expect(getScores(game)).toEqual(expected)
  })
})

describe('score corrections', () => {
  it('adds and takes away points by hand, without touching results or Poništi', () => {
    const game = topicFirst()
    const judged = run(game, next, start, reveal, right)
    const teamId = getCurrentTurn(judged)!.team.id
    const fixed = run(judged, { type: 'adjust', teamId, delta: -1 })
    expect(getScores(fixed)[teamId]).toBe(0)
    expect(fixed.results).toEqual(judged.results)
    const raised = run(fixed, { type: 'adjust', teamId, delta: 2 })
    expect(getScores(raised)[teamId]).toBe(2)
    expect(gameStateSchema.safeParse(raised).success).toBe(true)
  })

  it('ignores unknown teams and zero or fractional changes', () => {
    const game = topicFirst()
    const teamId = game.teams[0]!.id
    for (const action of [
      { type: 'adjust', teamId: 'nobody', delta: 1 },
      { type: 'adjust', teamId, delta: 0 },
      { type: 'adjust', teamId, delta: 0.5 },
    ] as GameAction[]) {
      expect(run(game, action)).toBe(game)
    }
  })

  it('is closed once the winner is being decided', () => {
    const finished = playToEnd(newGame())
    const teamId = finished.teams[0]!.id
    expect(run(finished, { type: 'adjust', teamId, delta: 1 })).toBe(finished)
  })
})
