import { z } from 'zod'
import {
  GAME_LENGTHS,
  QUESTION_FORMATS,
  ROUND_KINDS,
  SECONDS_PER_QUESTION_OPTIONS,
  TEAM_COLORS,
  TOPICS,
} from './constants'

// Single source for the shapes of questions, teams and a game in progress.
// Types are inferred from these schemas; src/storage validates saved games with them.

const index = z.number().int().min(0)
const id = z.string().min(1)

export const questionSchema = z.object({
  id,
  topic: z.enum(TOPICS),
  format: z.enum(QUESTION_FORMATS),
  difficulty: z.literal([1, 2, 3]),
  question: z.string().min(1),
  answer: z.string().min(1),
  /** Other forms of the answer that also count. */
  accept: z.array(z.string()),
  note: z.string().nullable(),
})
export type Question = z.infer<typeof questionSchema>

export const teamSchema = z.object({
  id,
  name: z.string(),
  color: z.enum(TEAM_COLORS),
})
export type Team = z.infer<typeof teamSchema>

export const gameOptionsSchema = z.object({
  length: z.enum(GAME_LENGTHS),
  secondsPerQuestion: z.literal(SECONDS_PER_QUESTION_OPTIONS),
  fastestFinger: z.boolean(),
})
export type GameOptions = z.infer<typeof gameOptionsSchema>

/** Wall-clock timer that survives pausing and saving: `runningSince` is null while paused. */
export const timerSchema = z.object({
  durationMs: z.number().int().positive(),
  elapsedMs: z.number().min(0),
  runningSince: z.number().nullable(),
})
export type Timer = z.infer<typeof timerSchema>

export const roundSchema = z.object({
  kind: z.enum(ROUND_KINDS),
  /** Double trouble: every point in this round counts twice. */
  doubled: z.boolean(),
  /** One turn per team, in playing order. */
  turns: z.array(z.object({ teamId: id, questionId: id })).min(1),
})
export type Round = z.infer<typeof roundSchema>

export const resultSchema = z.discriminatedUnion('type', [
  /** Open or true/false question answered by the team on turn. */
  z.object({
    type: z.literal('turn'),
    round: index,
    turn: index,
    teamId: id,
    questionId: id,
    correct: z.boolean(),
    points: z.number().int(),
  }),
  /** Estimate question: `teamId` is the team that got the point. */
  z.object({
    type: z.literal('estimate'),
    round: index,
    turn: index,
    teamId: id,
    questionId: id,
    points: z.number().int(),
  }),
  z.object({
    type: z.literal('fastestFinger'),
    teamId: id,
    questionId: id,
    correct: z.boolean(),
    points: z.number().int(),
  }),
])
export type Result = z.infer<typeof resultSchema>

const turnStep = { round: index, turn: index }

export const stepSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('roundIntro'), round: index }),
  z.object({ type: z.literal('turnIntro'), ...turnStep }),
  z.object({ type: z.literal('question'), ...turnStep, timer: timerSchema }),
  z.object({ type: z.literal('answer'), ...turnStep }),
  z.object({ type: z.literal('judged'), ...turnStep }),
  z.object({ type: z.literal('leaderboard'), round: index }),
  z.object({ type: z.literal('fastestFingerIntro') }),
  z.object({ type: z.literal('fastestFingerQuestion'), timer: timerSchema }),
  /** A team raised its hand first; the timer is stopped while it answers. */
  z.object({ type: z.literal('fastestFingerBuzzed'), teamId: id, timer: timerSchema }),
  /** Answer shown; `teamId` is null when nobody raised a hand. */
  z.object({ type: z.literal('fastestFingerAnswer'), teamId: id.nullable() }),
  z.object({ type: z.literal('fastestFingerJudged'), teamId: id }),
  z.object({ type: z.literal('tiebreakIntro') }),
  z.object({ type: z.literal('tiebreakQuestion'), timer: timerSchema }),
  z.object({ type: z.literal('tiebreakAnswer') }),
  z.object({ type: z.literal('finished') }),
])
export type Step = z.infer<typeof stepSchema>
export type StepType = Step['type']

export const gameStateSchema = z
  .object({
    teams: z.array(teamSchema).min(2).max(4),
    options: gameOptionsSchema,
    /** Every question this game can show, so it keeps working offline. */
    questions: z.record(z.string(), questionSchema),
    rounds: z.array(roundSchema).min(1),
    /** Played between rounds `afterRound` and `afterRound + 1`. */
    fastestFinger: z.object({ afterRound: index, questionId: id }).nullable(),
    tiebreakQuestionId: id,
    results: z.array(resultSchema),
    /** Results before this index are final (the game moved on), so Undo can't touch them. */
    committedResults: index,
    tiebreak: z.object({ teamIds: z.array(id).min(2), winnerId: id.nullable() }).nullable(),
    step: stepSchema,
  })
  .superRefine((game, ctx) => {
    const teamIds = new Set(game.teams.map((team) => team.id))
    const questionIds = [
      ...game.rounds.flatMap((round) => round.turns.map((turn) => turn.questionId)),
      game.tiebreakQuestionId,
      ...(game.fastestFinger ? [game.fastestFinger.questionId] : []),
    ]
    if (questionIds.some((questionId) => !(questionId in game.questions))) {
      ctx.addIssue({ code: 'custom', message: 'Game refers to a missing question' })
    }
    if (game.rounds.some((round) => round.turns.some((turn) => !teamIds.has(turn.teamId)))) {
      ctx.addIssue({ code: 'custom', message: 'Game refers to a missing team' })
    }
    if (game.committedResults > game.results.length) {
      ctx.addIssue({ code: 'custom', message: 'More committed results than results' })
    }
  })
export type GameState = z.infer<typeof gameStateSchema>
