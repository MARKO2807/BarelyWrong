import { describe, expect, it } from 'vitest'
import {
  getCommittedAnswerEvents,
  getCompletedRounds,
  getProgressEvents,
  getShownQuestionId,
  type ProgressEvent,
} from './events'
import { gameReducer, type GameAction } from './reducer'
import type { GameState } from './schema'
import {
  NOW,
  findGame,
  newGame,
  playToEnd,
  playToRound,
  playUntil,
  run,
  withScores,
} from './testing/fixtures'

/** Applies one action and returns both states. */
function step(game: GameState, action: GameAction): [GameState, GameState] {
  return [game, gameReducer(game, action)]
}

const start: GameAction = { type: 'start', now: NOW }
const next: GameAction = { type: 'next' }

describe('getShownQuestionId', () => {
  const game = newGame()

  it('reports a turn question when it appears', () => {
    const intro = run(game, next)
    expect(getShownQuestionId(...step(intro, start))).toBe(game.rounds[0]!.turns[0]!.questionId)
  })

  it('reports the Najbrži prst and tiebreak questions', () => {
    const ff = playUntil(game, 'fastestFingerIntro')
    expect(getShownQuestionId(...step(ff, start))).toBe(game.fastestFinger!.questionId)

    const last = playUntil(game, (g) => g.step.type === 'leaderboard' && g.step.round === 11)
    const tie = run(withScores(last, { t1: 1, t2: 1, t3: 0 }), next)
    expect(getShownQuestionId(...step(tie, start))).toBe(game.tiebreakQuestionId)
  })

  it('reports nothing for other changes', () => {
    const question = run(game, next, start)
    expect(getShownQuestionId(...step(question, { type: 'reveal' }))).toBeNull()
    const buzzed = run(playUntil(game, 'fastestFingerQuestion'), {
      type: 'buzz',
      teamId: 't1',
      now: NOW,
    })
    expect(getShownQuestionId(...step(buzzed, { type: 'undo', now: NOW }))).toBeNull()
  })
})

describe('getCommittedAnswerEvents', () => {
  const topicGame = findGame((g) => g.rounds[0]!.kind !== 'estimate')
  const answer = run(topicGame, next, start, { type: 'reveal' })

  it('sends an answer only when the game moves on', () => {
    const [before, judged] = step(answer, { type: 'judge', correct: true })
    expect(getCommittedAnswerEvents(before, judged)).toEqual([])
    expect(getCommittedAnswerEvents(...step(judged, next))).toEqual([
      { questionId: topicGame.rounds[0]!.turns[0]!.questionId, kind: 'turn', correct: true },
    ])
  })

  it('sends only the final judgement after an undo', () => {
    const corrected = run(
      answer,
      { type: 'judge', correct: true },
      { type: 'undo', now: NOW },
      { type: 'judge', correct: false },
    )
    expect(getCommittedAnswerEvents(...step(corrected, next))).toEqual([
      expect.objectContaining({ correct: false }),
    ])
  })

  it('does not record estimate questions', () => {
    const base = findGame((g) => g.rounds[0]!.kind === 'estimate')
    const judged = run(
      base,
      next,
      start,
      { type: 'reveal' },
      {
        type: 'award',
        teamId: base.rounds[0]!.turns[0]!.teamId,
      },
    )
    expect(getCommittedAnswerEvents(...step(judged, next))).toEqual([])
  })

  it('records Najbrži prst with its own kind', () => {
    const judged = run(
      playUntil(newGame(), 'fastestFingerQuestion'),
      { type: 'buzz', teamId: 't2', now: NOW + 1 },
      { type: 'reveal' },
      { type: 'judge', correct: false },
    )
    expect(getCommittedAnswerEvents(...step(judged, next))).toEqual([
      { questionId: judged.fastestFinger!.questionId, kind: 'fastest_finger', correct: false },
    ])
  })

  it('records nothing when nobody raised a hand', () => {
    const answerShown = run(playUntil(newGame(), 'fastestFingerQuestion'), { type: 'reveal' })
    expect(getCommittedAnswerEvents(...step(answerShown, next))).toEqual([])
  })

  it('records every answer exactly once over a whole game', () => {
    let game = playToRound(newGame({ teams: 2 }), 0)
    const events: unknown[] = []
    for (let i = 0; i < 2000 && game.step.type !== 'finished'; i++) {
      const before = game
      game = playUntil(game, (g) => g !== before)
      events.push(...getCommittedAnswerEvents(before, game))
    }
    const expected = game.results.filter((r) => r.type !== 'estimate').length
    expect(events).toHaveLength(expected)
  })
})

describe('getProgressEvents', () => {
  /** Every progress event of a game played to the end, step by step. */
  function progressOf(game: GameState): ProgressEvent[] {
    const events: ProgressEvent[] = []
    let current = game
    for (let i = 0; i < 5000 && current.step.type !== 'finished'; i++) {
      const before = current
      current = playUntil(current, (g) => g !== before)
      events.push(...getProgressEvents(before, current))
    }
    return events
  }

  it('reports each round once and then the end of the game', () => {
    const game = newGame({ teams: 2 })
    const rounds = game.rounds.length
    expect(progressOf(game)).toEqual([
      ...Array.from({ length: rounds }, (_, i) => ({ event: 'round', round: i + 1 })),
      { event: 'finished', round: rounds },
    ])
  })

  it('counts rounds of a short game', () => {
    const events = progressOf(newGame({ options: { length: 'short', fastestFinger: false } }))
    expect(events.at(-1)).toEqual({ event: 'finished', round: 6 })
  })

  it('reports the end after a tiebreak, and again after an undo of the winner', () => {
    const last = playUntil(newGame(), (g) => g.step.type === 'leaderboard' && g.step.round === 11)
    const tied = run(withScores(last, { t1: 1, t2: 1, t3: 0 }), next, start, { type: 'reveal' })
    const [answer, finished] = step(tied, { type: 'award', teamId: 't1' })
    expect(getProgressEvents(answer, finished)).toEqual([{ event: 'finished', round: 12 }])
    const [, undone] = step(finished, { type: 'undo', now: NOW })
    expect(getProgressEvents(finished, undone)).toEqual([])
  })

  it('reports nothing within a round', () => {
    const question = run(newGame(), next, start)
    expect(getProgressEvents(...step(question, { type: 'reveal' }))).toEqual([])
  })
})

describe('getCompletedRounds', () => {
  const game = newGame()

  it('counts finished rounds as the game goes on', () => {
    expect(getCompletedRounds(game)).toBe(0)
    expect(getCompletedRounds(run(game, next, start))).toBe(0)
    expect(getCompletedRounds(playUntil(game, 'leaderboard'))).toBe(1)
    expect(getCompletedRounds(playToRound(game, 3))).toBe(3)
    expect(getCompletedRounds(playToEnd(game))).toBe(game.rounds.length)
  })

  it('counts Najbrži prst as after its round', () => {
    const ff = playUntil(game, 'fastestFingerIntro')
    expect(getCompletedRounds(ff)).toBe(game.fastestFinger!.afterRound + 1)
  })
})
