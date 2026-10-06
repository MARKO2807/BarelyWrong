import { DOUBLE_TROUBLE_MULTIPLIER, type RoundKind } from './constants'
import type { GameState, Question, Result, Round, Team, Timer } from './schema'

/** Columns of the per-topic score table: round kinds, Najbrži prst and the host's corrections. */
export type ScoreColumn = RoundKind | 'fastest_finger' | 'correction'

export interface RankedTeam {
  teamId: string
  score: number
  /** Shared by tied teams: 1, 1, 3. */
  rank: number
}

export function getMultiplier(round: Round): number {
  return round.doubled ? DOUBLE_TROUBLE_MULTIPLIER : 1
}

export function getTeam(game: GameState, teamId: string): Team {
  const team = game.teams.find((t) => t.id === teamId)
  if (!team) throw new Error(`Unknown team ${teamId}`)
  return team
}

/** In an estimate round, the next team in order says whether the answer is higher or lower. */
export function getChallenger(game: GameState, teamId: string): Team {
  const index = game.teams.findIndex((team) => team.id === teamId)
  return game.teams[(index + 1) % game.teams.length]!
}

export interface CurrentTurn {
  roundIndex: number
  turnIndex: number
  round: Round
  team: Team
  question: Question
  /** Only in estimate rounds. */
  challenger: Team | null
  multiplier: number
  /** Set once the turn is judged. */
  result: Result | null
}

export function getCurrentTurn(game: GameState): CurrentTurn | null {
  const { step } = game
  if (!('turn' in step)) return null
  const round = game.rounds[step.round]!
  const turn = round.turns[step.turn]!
  return {
    roundIndex: step.round,
    turnIndex: step.turn,
    round,
    team: getTeam(game, turn.teamId),
    question: game.questions[turn.questionId]!,
    challenger: round.kind === 'estimate' ? getChallenger(game, turn.teamId) : null,
    multiplier: getMultiplier(round),
    result: step.type === 'judged' ? (game.results.at(-1) ?? null) : null,
  }
}

/** The round being played or just finished, for the "3/12" badge and the topic. */
export function getCurrentRoundIndex(game: GameState): number | null {
  return 'round' in game.step ? game.step.round : null
}

/** The question on screen; null during announcements so nothing is revealed early. */
export function getActiveQuestion(game: GameState): Question | null {
  switch (game.step.type) {
    case 'question':
    case 'answer':
    case 'judged':
      return getCurrentTurn(game)!.question
    case 'fastestFingerQuestion':
    case 'fastestFingerBuzzed':
    case 'fastestFingerAnswer':
    case 'fastestFingerJudged':
      return game.questions[game.fastestFinger!.questionId]!
    case 'tiebreakQuestion':
    case 'tiebreakAnswer':
      return game.questions[game.tiebreakQuestionId]!
    default:
      return null
  }
}

export function getTimer(game: GameState): Timer | null {
  return 'timer' in game.step ? game.step.timer : null
}

/** Undo works on the last decision until the game moves on. */
export function canUndo(game: GameState): boolean {
  switch (game.step.type) {
    case 'judged':
    case 'fastestFingerJudged':
      return game.results.length > game.committedResults
    case 'fastestFingerBuzzed':
      return true
    case 'finished':
      return game.tiebreak?.winnerId != null
    default:
      return false
  }
}

function sumScores(game: GameState, results: readonly Result[]): Record<string, number> {
  const scores = Object.fromEntries(game.teams.map((team) => [team.id, 0]))
  for (const result of results) scores[result.teamId] = (scores[result.teamId] ?? 0) + result.points
  for (const [teamId, points] of Object.entries(game.adjustments))
    scores[teamId] = (scores[teamId] ?? 0) + points
  return scores
}

export function getScores(game: GameState): Record<string, number> {
  return sumScores(game, game.results)
}

/** Points per team per round kind, with Najbrži prst in its own column. */
export function getScoresByColumn(
  game: GameState,
): Record<string, Partial<Record<ScoreColumn, number>>> {
  const table: Record<string, Partial<Record<ScoreColumn, number>>> = Object.fromEntries(
    game.teams.map((team) => [team.id, {}]),
  )
  for (const result of game.results) {
    const column: ScoreColumn =
      result.type === 'fastestFinger' ? 'fastest_finger' : game.rounds[result.round]!.kind
    const row = table[result.teamId]!
    row[column] = (row[column] ?? 0) + result.points
  }
  for (const [teamId, points] of Object.entries(game.adjustments)) {
    const row = table[teamId]
    if (row && points !== 0) row.correction = points
  }
  return table
}

/** Highest score first; a tiebreak winner goes ahead of the teams it tied with. */
export function rankTeams(
  teams: readonly Team[],
  scores: Record<string, number>,
  winnerId: string | null = null,
): RankedTeam[] {
  const key = (teamId: string) => [scores[teamId] ?? 0, teamId === winnerId ? 1 : 0] as const
  const ahead = (a: string, b: string) => {
    const [scoreA, winA] = key(a)
    const [scoreB, winB] = key(b)
    return scoreA > scoreB || (scoreA === scoreB && winA > winB)
  }
  return teams
    .map((team) => ({
      teamId: team.id,
      score: scores[team.id] ?? 0,
      rank: 1 + teams.filter((other) => ahead(other.id, team.id)).length,
    }))
    .sort((a, b) => a.rank - b.rank)
}

export function getRanking(game: GameState): RankedTeam[] {
  return rankTeams(game.teams, getScores(game), game.tiebreak?.winnerId ?? null)
}

/** Standings as they were after a round, for animating the leaderboard from one round to the next. */
export function getRankingAfterRound(game: GameState, roundIndex: number): RankedTeam[] {
  const results = game.results.filter((result) =>
    result.type === 'fastestFinger'
      ? game.fastestFinger !== null && game.fastestFinger.afterRound < roundIndex
      : result.round <= roundIndex,
  )
  return rankTeams(game.teams, sumScores(game, results))
}

/** Teams sharing first place; empty when there is a single leader. */
export function getTopTiedTeamIds(game: GameState): string[] {
  const leaders = getRanking(game).filter((team) => team.rank === 1)
  return leaders.length > 1 ? leaders.map((team) => team.teamId) : []
}

export interface Outcome {
  winnerId: string
  ranking: RankedTeam[]
  /** These teams get "Error 404: IQ not found." */
  lastPlaceTeamIds: string[]
}

export function getOutcome(game: GameState): Outcome | null {
  if (game.step.type !== 'finished') return null
  const ranking = getRanking(game)
  const winnerId = ranking[0]!.teamId
  const lastRank = Math.max(...ranking.map((team) => team.rank))
  return {
    winnerId,
    ranking,
    lastPlaceTeamIds: ranking
      .filter((team) => team.rank === lastRank && team.teamId !== winnerId)
      .map((team) => team.teamId),
  }
}

export function getProgress(game: GameState): { round: number; total: number } | null {
  const roundIndex = getCurrentRoundIndex(game)
  return roundIndex === null ? null : { round: roundIndex + 1, total: game.rounds.length }
}
