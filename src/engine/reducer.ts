import {
  FASTEST_FINGER_CORRECT_POINTS,
  FASTEST_FINGER_SECONDS,
  FASTEST_FINGER_WRONG_POINTS,
} from './constants'
import type { GameState, Result, Step, Timer } from './schema'
import { getChallenger, getMultiplier, getTopTiedTeamIds } from './selectors'
import { pauseTimer, remainingMs, resumeTimer, startTimer } from './timer'

/**
 * What the host can do. Times (`now`) are epoch milliseconds from the caller.
 * An action that doesn't fit the current step is ignored, so repeated key presses are harmless.
 */
export type GameAction =
  /** "Kreni" on a team, Najbrži prst or tiebreak announcement: shows the question and starts the timer. */
  | { type: 'start'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  /** "Otvori odgovor", or the timer ran out. */
  | { type: 'reveal' }
  /** Točno / Netočno for open and true/false questions and for Najbrži prst. */
  | { type: 'judge'; correct: boolean }
  /** Estimate round: the team that gets the point. Tiebreak: the closest team, who wins. */
  | { type: 'award'; teamId: string }
  /** Najbrži prst: the team that raised its hand first. Stops the timer. */
  | { type: 'buzz'; teamId: string; now: number }
  /** Poništi: takes back the last decision until the game moves on. */
  | { type: 'undo'; now: number }
  /** Dalje. */
  | { type: 'next' }
  /** Ispravi bodove: adds `delta` points to a team by hand. Not undone by Poništi. */
  | { type: 'adjust'; teamId: string; delta: number }

function withStep(game: GameState, step: Step): GameState {
  return { ...game, step }
}

function addResult(game: GameState, result: Result, step: Step): GameState {
  return { ...game, results: [...game.results, result], step }
}

function dropLastResult(game: GameState, step: Step): GameState {
  return { ...game, results: game.results.slice(0, -1), step }
}

/** Moving on makes every result so far final. */
function commit(game: GameState, step: Step): GameState {
  return { ...game, committedResults: game.results.length, step }
}

function questionMs(game: GameState): number {
  return game.options.secondsPerQuestion * 1000
}

function start(game: GameState, now: number): GameState {
  const { step } = game
  switch (step.type) {
    case 'turnIntro':
      return withStep(game, { ...step, type: 'question', timer: startTimer(questionMs(game), now) })
    case 'fastestFingerIntro':
      return withStep(game, {
        type: 'fastestFingerQuestion',
        timer: startTimer(FASTEST_FINGER_SECONDS * 1000, now),
      })
    case 'tiebreakIntro':
      return withStep(game, { type: 'tiebreakQuestion', timer: startTimer(questionMs(game), now) })
    default:
      return game
  }
}

/** Pause and resume only apply while a question is on screen with its clock. */
function updateTimer(game: GameState, update: (timer: Timer) => Timer): GameState {
  const { step } = game
  if (
    step.type === 'question' ||
    step.type === 'fastestFingerQuestion' ||
    step.type === 'tiebreakQuestion'
  ) {
    return withStep(game, { ...step, timer: update(step.timer) })
  }
  return game
}

function reveal(game: GameState): GameState {
  const { step } = game
  switch (step.type) {
    case 'question':
      return withStep(game, { type: 'answer', round: step.round, turn: step.turn })
    case 'fastestFingerQuestion':
      return withStep(game, { type: 'fastestFingerAnswer', teamId: null })
    case 'fastestFingerBuzzed':
      return withStep(game, { type: 'fastestFingerAnswer', teamId: step.teamId })
    case 'tiebreakQuestion':
      return withStep(game, { type: 'tiebreakAnswer' })
    default:
      return game
  }
}

function judge(game: GameState, correct: boolean): GameState {
  const { step } = game
  if (step.type === 'answer') {
    const round = game.rounds[step.round]!
    if (round.kind === 'estimate') return game
    const turn = round.turns[step.turn]!
    return addResult(
      game,
      {
        type: 'turn',
        round: step.round,
        turn: step.turn,
        teamId: turn.teamId,
        questionId: turn.questionId,
        correct,
        points: correct ? getMultiplier(round) : 0,
      },
      { type: 'judged', round: step.round, turn: step.turn },
    )
  }
  if (step.type === 'fastestFingerAnswer' && step.teamId !== null) {
    // Never doubled, and a wrong answer costs a point even if it takes the total below zero.
    return addResult(
      game,
      {
        type: 'fastestFinger',
        teamId: step.teamId,
        questionId: game.fastestFinger!.questionId,
        correct,
        points: correct ? FASTEST_FINGER_CORRECT_POINTS : FASTEST_FINGER_WRONG_POINTS,
      },
      { type: 'fastestFingerJudged', teamId: step.teamId },
    )
  }
  return game
}

function award(game: GameState, teamId: string): GameState {
  const { step } = game
  if (step.type === 'answer') {
    const round = game.rounds[step.round]!
    const turn = round.turns[step.turn]!
    // The challenger gets the point if right, otherwise the estimating team (also on an exact guess).
    const allowed = [turn.teamId, getChallenger(game, turn.teamId).id]
    if (round.kind !== 'estimate' || !allowed.includes(teamId)) return game
    return addResult(
      game,
      {
        type: 'estimate',
        round: step.round,
        turn: step.turn,
        teamId,
        questionId: turn.questionId,
        points: getMultiplier(round),
      },
      { type: 'judged', round: step.round, turn: step.turn },
    )
  }
  if (step.type === 'tiebreakAnswer' && game.tiebreak?.teamIds.includes(teamId)) {
    // The tiebreak only decides the winner; it adds no points.
    return { ...game, tiebreak: { ...game.tiebreak, winnerId: teamId }, step: { type: 'finished' } }
  }
  return game
}

function buzz(game: GameState, teamId: string, now: number): GameState {
  const { step } = game
  if (step.type !== 'fastestFingerQuestion') return game
  if (!game.teams.some((team) => team.id === teamId) || remainingMs(step.timer, now) <= 0)
    return game
  return withStep(game, { type: 'fastestFingerBuzzed', teamId, timer: pauseTimer(step.timer, now) })
}

function undo(game: GameState, now: number): GameState {
  const { step } = game
  const hasOpenResult = game.results.length > game.committedResults
  switch (step.type) {
    case 'judged':
      return hasOpenResult
        ? dropLastResult(game, { type: 'answer', round: step.round, turn: step.turn })
        : game
    case 'fastestFingerJudged':
      return hasOpenResult
        ? dropLastResult(game, { type: 'fastestFingerAnswer', teamId: step.teamId })
        : game
    case 'fastestFingerBuzzed':
      // Wrong team picked: the clock carries on where it stopped.
      return withStep(game, { type: 'fastestFingerQuestion', timer: resumeTimer(step.timer, now) })
    case 'finished':
      return game.tiebreak?.winnerId != null
        ? {
            ...game,
            tiebreak: { ...game.tiebreak, winnerId: null },
            step: { type: 'tiebreakAnswer' },
          }
        : game
    default:
      return game
  }
}

function afterRound(game: GameState, roundIndex: number): GameState {
  const isLast = roundIndex === game.rounds.length - 1
  if (isLast) {
    const tied = getTopTiedTeamIds(game)
    return tied.length > 1
      ? { ...game, tiebreak: { teamIds: tied, winnerId: null }, step: { type: 'tiebreakIntro' } }
      : withStep(game, { type: 'finished' })
  }
  if (game.fastestFinger?.afterRound === roundIndex) {
    return withStep(game, { type: 'fastestFingerIntro' })
  }
  return withStep(game, { type: 'roundIntro', round: roundIndex + 1 })
}

function next(game: GameState): GameState {
  const { step } = game
  switch (step.type) {
    case 'roundIntro':
      return withStep(game, { type: 'turnIntro', round: step.round, turn: 0 })
    case 'judged': {
      const isLastTurn = step.turn === game.rounds[step.round]!.turns.length - 1
      return commit(
        game,
        isLastTurn
          ? { type: 'leaderboard', round: step.round }
          : { type: 'turnIntro', round: step.round, turn: step.turn + 1 },
      )
    }
    case 'leaderboard':
      return afterRound(game, step.round)
    case 'fastestFingerAnswer':
      // Only when nobody raised a hand; otherwise the answer must be judged first.
      return step.teamId === null
        ? withStep(game, { type: 'roundIntro', round: game.fastestFinger!.afterRound + 1 })
        : game
    case 'fastestFingerJudged':
      return commit(game, { type: 'roundIntro', round: game.fastestFinger!.afterRound + 1 })
    default:
      return game
  }
}

/**
 * Corrections are allowed until the winner is being decided, so a tie they would create still
 * goes to the tiebreak.
 */
export function canAdjustScores(game: GameState): boolean {
  return !['tiebreakIntro', 'tiebreakQuestion', 'tiebreakAnswer', 'finished'].includes(
    game.step.type,
  )
}

function adjust(game: GameState, teamId: string, delta: number): GameState {
  if (!canAdjustScores(game) || !Number.isInteger(delta) || delta === 0) return game
  if (!game.teams.some((team) => team.id === teamId)) return game
  const adjustments = { ...game.adjustments, [teamId]: (game.adjustments[teamId] ?? 0) + delta }
  return { ...game, adjustments }
}

export function gameReducer(game: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'adjust':
      return adjust(game, action.teamId, action.delta)
    case 'start':
      return start(game, action.now)
    case 'pause':
      return updateTimer(game, (timer) => pauseTimer(timer, action.now))
    case 'resume':
      return updateTimer(game, (timer) => resumeTimer(timer, action.now))
    case 'reveal':
      return reveal(game)
    case 'judge':
      return judge(game, action.correct)
    case 'award':
      return award(game, action.teamId)
    case 'buzz':
      return buzz(game, action.teamId, action.now)
    case 'undo':
      return undo(game, action.now)
    case 'next':
      return next(game)
  }
}
