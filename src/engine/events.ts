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
