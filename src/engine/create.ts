import { randomInt, type Rng } from './random'
import type { GameOptions, GameState, Question, Team } from './schema'
import { selectQuestions, type Shortage } from './select'
import { normalizeTeamName, validateSetup } from './setup'

export interface CreateGameInput {
  teams: Team[]
  options: GameOptions
  pool: readonly Question[]
  playedIds: ReadonlySet<string>
  rng: Rng
}

export type CreateGameResult = { ok: true; game: GameState } | { ok: false; shortages: Shortage[] }

/**
 * Sets up a whole game: questions, round order, the Double trouble round (never the first),
 * where Najbrži prst falls (between two rounds) and the team that starts. Every random choice
 * happens here, so playing the game is deterministic.
 */
export function createGame({
  teams,
  options,
  pool,
  playedIds,
  rng,
}: CreateGameInput): CreateGameResult {
  const problems = validateSetup({ teams, options })
  if (problems.length > 0) {
    throw new Error(`Invalid game setup: ${problems.map((p) => p.type).join(', ')}`)
  }
  if (new Set(teams.map((team) => team.id)).size !== teams.length) {
    throw new Error('Invalid game setup: duplicate team ids')
  }

  const selection = selectQuestions({
    pool,
    playedIds,
    teamCount: teams.length,
    length: options.length,
    fastestFinger: options.fastestFinger,
    rng,
  })
  if (!selection.ok) return selection
  const { plan } = selection

  const roundCount = plan.rounds.length
  const firstTeam = randomInt(rng, teams.length)
  const doubledRound = roundCount > 1 ? 1 + randomInt(rng, roundCount - 1) : -1
  const fastestFingerAfter =
    plan.fastestFingerQuestionId !== null && roundCount > 1 ? randomInt(rng, roundCount - 1) : null

  const rounds = plan.rounds.map((round, roundIndex) => ({
    kind: round.kind,
    doubled: roundIndex === doubledRound,
    // Teams keep the same order all game (A, B, A, B…), so nobody plays twice in a row.
    turns: round.questionIds.map((questionId, turnIndex) => ({
      teamId: teams[(firstTeam + turnIndex) % teams.length]!.id,
      questionId,
    })),
  }))

  const questionIds = [
    ...plan.rounds.flatMap((round) => round.questionIds),
    plan.tiebreakQuestionId,
    ...(fastestFingerAfter !== null && plan.fastestFingerQuestionId
      ? [plan.fastestFingerQuestionId]
      : []),
  ]
  const byId = new Map(pool.map((question) => [question.id, question]))

  return {
    ok: true,
    game: {
      teams: teams.map((team) => ({ ...team, name: normalizeTeamName(team.name) })),
      options,
      questions: Object.fromEntries(
        questionIds.map((questionId) => [questionId, byId.get(questionId)!]),
      ),
      rounds,
      fastestFinger:
        fastestFingerAfter !== null && plan.fastestFingerQuestionId
          ? { afterRound: fastestFingerAfter, questionId: plan.fastestFingerQuestionId }
          : null,
      tiebreakQuestionId: plan.tiebreakQuestionId,
      results: [],
      committedResults: 0,
      tiebreak: null,
      adjustments: {},
      step: { type: 'roundIntro', round: 0 },
    },
  }
}

/** Revanš: same teams and options, new questions (the caller passes the updated played list). */
export function createRematch(
  game: GameState,
  input: Pick<CreateGameInput, 'pool' | 'playedIds' | 'rng'>,
): CreateGameResult {
  return createGame({ ...input, teams: game.teams, options: game.options })
}
