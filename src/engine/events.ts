import type { GameState, StepType } from './schema'

// Side effects the app derives from one state change (previous → next), kept out of the reducer.

/** Matches the `answer_events` table: estimate questions are not recorded. */
export interface AnswerEvent {
  questionId: string
  kind: 'turn' | 'fastest_finger'
  correct: boolean
}

const QUESTION_STEPS: Partial<Record<StepType, StepType>> = {
  turnIntro: 'question',
  fastestFingerIntro: 'fastestFingerQuestion',
  tiebreakIntro: 'tiebreakQuestion',
}

/** The question that just appeared on screen; from then on it counts as played on this device. */
export function getShownQuestionId(previous: GameState, next: GameState): string | null {
  if (QUESTION_STEPS[previous.step.type] !== next.step.type) return null
  const { step } = next
  switch (step.type) {
    case 'question':
      return next.rounds[step.round]!.turns[step.turn]!.questionId
    case 'fastestFingerQuestion':
      return next.fastestFinger!.questionId
    case 'tiebreakQuestion':
      return next.tiebreakQuestionId
    default:
      return null
  }
}

/**
 * Answers that became final with this change. A result is final once the game moves on,
 * so an Undo never has to take back statistics that were already sent.
 */
export function getCommittedAnswerEvents(previous: GameState, next: GameState): AnswerEvent[] {
  if (next.committedResults <= previous.committedResults) return []
  return next.results
    .slice(previous.committedResults, next.committedResults)
    .flatMap((result): AnswerEvent[] => {
      if (result.type === 'turn') {
        return [{ questionId: result.questionId, kind: 'turn', correct: result.correct }]
      }
      if (result.type === 'fastestFinger') {
        return [{ questionId: result.questionId, kind: 'fastest_finger', correct: result.correct }]
      }
      return []
    })
}

/** Matches the `game_progress` table: rounds are numbered from 1. */
export interface ProgressEvent {
  event: 'turn' | 'round' | 'finished'
  round: number
  /** Question number in the round (from 1) for 'turn'; 0 otherwise. */
  turn: number
}

/**
 * A question, a round or the whole game that ended with this change (for the editor's activity
 * page). A question counts once the game moves on from its judgement, like the statistics.
 */
export function getProgressEvents(previous: GameState, next: GameState): ProgressEvent[] {
  const { step } = next
  if (step.type === previous.step.type) return []
  const events: ProgressEvent[] = []
  const before = previous.step
  if (before.type === 'judged' && (step.type === 'turnIntro' || step.type === 'leaderboard'))
    events.push({ event: 'turn', round: before.round + 1, turn: before.turn + 1 })
  if (step.type === 'leaderboard') events.push({ event: 'round', round: step.round + 1, turn: 0 })
  if (step.type === 'finished')
    events.push({ event: 'finished', round: next.rounds.length, turn: 0 })
  return events
}

/** How many rounds are over: what Prekini partiju reports as the round the game got to. */
export function getCompletedRounds(game: GameState): number {
  const { step } = game
  switch (step.type) {
    case 'roundIntro':
    case 'turnIntro':
    case 'question':
    case 'answer':
    case 'judged':
      return step.round
    case 'leaderboard':
      return step.round + 1
    case 'fastestFingerIntro':
    case 'fastestFingerQuestion':
    case 'fastestFingerBuzzed':
    case 'fastestFingerAnswer':
    case 'fastestFingerJudged':
      return game.fastestFinger!.afterRound + 1
    default:
      return game.rounds.length
  }
}
