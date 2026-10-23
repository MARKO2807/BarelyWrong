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
  event: 'round' | 'finished'
  round: number
}

/** A round or the whole game that ended with this change (for the editor's activity page). */
export function getProgressEvents(previous: GameState, next: GameState): ProgressEvent[] {
  const { step } = next
  if (step.type === previous.step.type) return []
  if (step.type === 'leaderboard') return [{ event: 'round', round: step.round + 1 }]
  if (step.type === 'finished') return [{ event: 'finished', round: next.rounds.length }]
  return []
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
