// Game rules: pure TypeScript, no React. Screens read state through selectors and send actions.

export * from './constants'
export { createGame, createRematch, type CreateGameInput, type CreateGameResult } from './create'
export { getCommittedAnswerEvents, getShownQuestionId, type AnswerEvent } from './events'
export { createSeededRng, type Rng } from './random'
export { canAdjustScores, gameReducer, type GameAction } from './reducer'
export * from './schema'
export {
  questionFitsKind,
  selectQuestions,
  type QuestionPlan,
  type SelectionInput,
  type SelectionResult,
  type Shortage,
  type ShortageKind,
} from './select'
export * from './selectors'
export {
  estimatedDurationSeconds,
  normalizeTeamName,
  validateSetup,
  type GameSetup,
  type SetupProblem,
} from './setup'
export { isTimerRunning, remainingMs } from './timer'
