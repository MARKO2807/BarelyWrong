// Test helpers: made-up questions and teams, and a driver that plays games step by step.

import { TEAM_COLORS, TOPICS } from '../constants'
import { createGame } from '../create'
import { createSeededRng } from '../random'
import { gameReducer, type GameAction } from '../reducer'
import type { GameOptions, GameState, Question, StepType, Team } from '../schema'
import { getCurrentTurn } from '../selectors'

export const TEST_OPTIONS: GameOptions = {
  length: 'full',
  secondsPerQuestion: 60,
  fastestFinger: true,
}

export const NOW = 1_000_000

export function makeQuestion(
  question: Pick<Question, 'id' | 'topic' | 'format'> & Partial<Question>,
): Question {
  return {
    difficulty: 2,
    question: `Pitanje ${question.id}?`,
    answer: `Odgovor ${question.id}`,
    accept: [],
    note: null,
    ...question,
  }
}

const DIFFICULTY_CYCLE = [1, 2, 2, 3] as const

/** Questions for every round kind; difficulties cycle 1, 2, 2, 3 so both bands come up. */
export function makePool({ perTopic = 10, trueFalse = 10, estimate = 10 } = {}): Question[] {
  const difficulty = (i: number) => DIFFICULTY_CYCLE[i % DIFFICULTY_CYCLE.length]!
  const topicOf = (i: number) => TOPICS[i % TOPICS.length]!
  return [
    ...TOPICS.flatMap((topic) =>
      Array.from({ length: perTopic }, (_, i) =>
        makeQuestion({ id: `${topic}-${i}`, topic, format: 'open', difficulty: difficulty(i) }),
      ),
    ),
    ...Array.from({ length: trueFalse }, (_, i) =>
      makeQuestion({
        id: `tf-${i}`,
        topic: topicOf(i),
        format: 'true_false',
        difficulty: difficulty(i),
      }),
    ),
    ...Array.from({ length: estimate }, (_, i) =>
      makeQuestion({
        id: `est-${i}`,
        topic: topicOf(i),
        format: 'estimate',
        difficulty: difficulty(i),
      }),
    ),
  ]
}

export function makeTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `t${i + 1}`,
    name: `Tim ${i + 1}`,
    color: TEAM_COLORS[i]!,
  }))
}

interface NewGameOptions {
  seed?: number
  teams?: number
  options?: Partial<GameOptions>
  pool?: Question[]
  playedIds?: Set<string>
}

export function newGame({
  seed = 1,
  teams = 3,
  options = {},
  pool = makePool(),
  playedIds = new Set(),
}: NewGameOptions = {}): GameState {
  const result = createGame({
    teams: makeTeams(teams),
    options: { ...TEST_OPTIONS, ...options },
    pool,
    playedIds,
    rng: createSeededRng(seed),
  })
  if (!result.ok) throw new Error(`Fixture game failed: ${JSON.stringify(result.shortages)}`)
  return result.game
}

export function run(game: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, game)
}

/** How the driver answers each decision; defaults: everyone right, first tied team wins. */
export interface Policy {
  correct?: (game: GameState) => boolean
  /** Estimate rounds: the team that gets the point. */
  estimateWinner?: (game: GameState) => string
  /** Najbrži prst: who raises a hand first (null: nobody) and whether they are right. */
  buzzer?: (game: GameState) => string | null
  buzzerCorrect?: (game: GameState) => boolean
  tiebreakWinner?: (game: GameState) => string
}

/** The single natural action for the current step, as the host would press it. */
export function nextAction(game: GameState, policy: Policy = {}): GameAction | null {
  const { step } = game
  switch (step.type) {
    case 'roundIntro':
    case 'judged':
    case 'leaderboard':
    case 'fastestFingerJudged':
      return { type: 'next' }
    case 'turnIntro':
    case 'fastestFingerIntro':
    case 'tiebreakIntro':
      return { type: 'start', now: NOW }
    case 'question':
    case 'fastestFingerBuzzed':
    case 'tiebreakQuestion':
      return { type: 'reveal' }
    case 'answer': {
      const turn = getCurrentTurn(game)!
      return turn.round.kind === 'estimate'
        ? { type: 'award', teamId: policy.estimateWinner?.(game) ?? turn.team.id }
        : { type: 'judge', correct: policy.correct?.(game) ?? true }
    }
    case 'fastestFingerQuestion': {
      const teamId = policy.buzzer ? policy.buzzer(game) : game.teams[0]!.id
      return teamId === null ? { type: 'reveal' } : { type: 'buzz', teamId, now: NOW + 1000 }
    }
    case 'fastestFingerAnswer':
      return step.teamId === null
        ? { type: 'next' }
        : { type: 'judge', correct: policy.buzzerCorrect?.(game) ?? true }
    case 'tiebreakAnswer':
      return {
        type: 'award',
        teamId: policy.tiebreakWinner?.(game) ?? game.tiebreak!.teamIds[0]!,
      }
    case 'finished':
      return null
  }
}

/** Plays until the step type (or a step matching the predicate) is reached, or the game ends. */
export function playUntil(
  game: GameState,
  until: StepType | ((game: GameState) => boolean),
  policy: Policy = {},
): GameState {
  const done = typeof until === 'function' ? until : (g: GameState) => g.step.type === until
  let current = game
  for (let guard = 0; guard < 10_000; guard++) {
    if (done(current)) return current
    const action = nextAction(current, policy)
    if (!action) return current
    current = gameReducer(current, action)
  }
  throw new Error('playUntil: the game did not progress')
}

/** Plays up to the announcement of a round. */
export function playToRound(game: GameState, round: number, policy: Policy = {}): GameState {
  return playUntil(game, (g) => g.step.type === 'roundIntro' && g.step.round === round, policy)
}

export function playToEnd(game: GameState, policy: Policy = {}): GameState {
  return playUntil(game, 'finished', policy)
}

/** Replaces the results so teams have the given totals; for testing how a game ends. */
export function withScores(game: GameState, scores: Record<string, number>): GameState {
  const questionId = game.rounds[0]!.turns[0]!.questionId
  const results = Object.entries(scores).map(([teamId, points]) => ({
    type: 'turn' as const,
    round: 0,
    turn: 0,
    teamId,
    questionId,
    correct: true,
    points,
  }))
  return { ...game, results, committedResults: results.length }
}

/** First seed whose game passes the check, e.g. one where Double trouble falls on the estimate round. */
export function findGame(
  check: (game: GameState) => boolean,
  options: Parameters<typeof newGame>[0] = {},
) {
  for (let seed = 1; seed <= 2000; seed++) {
    const game = newGame({ ...options, seed })
    if (check(game)) return game
  }
  throw new Error('findGame: no seed matched')
}
