import {
  DURATION_OVERHEAD_SECONDS,
  MAX_TEAMS,
  MIN_TEAMS,
  ROUNDS_PER_GAME,
  TEAM_NAME_MAX_LENGTH,
} from './constants'
import { gameOptionsSchema, type GameOptions, type Team } from './schema'

export interface GameSetup {
  teams: Team[]
  options: GameOptions
}

/** Each problem names the team it belongs to, so the setup screen can mark the right field. */
export type SetupProblem =
  | { type: 'teamCount' }
  | { type: 'options' }
  | { type: 'nameMissing'; teamId: string }
  | { type: 'nameTooLong'; teamId: string }
  | { type: 'nameTaken'; teamId: string }
  | { type: 'colorTaken'; teamId: string }
  | { type: 'iconTaken'; teamId: string }

/** Trims and collapses inner whitespace. */
export function normalizeTeamName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/** Problems that keep "Kreni" disabled; an empty list means the game can start. */
export function validateSetup({ teams, options }: GameSetup): SetupProblem[] {
  const problems: SetupProblem[] = []
  if (teams.length < MIN_TEAMS || teams.length > MAX_TEAMS) problems.push({ type: 'teamCount' })
  if (!gameOptionsSchema.safeParse(options).success) problems.push({ type: 'options' })

  const names = new Set<string>()
  const colors = new Set<string>()
  const icons = new Set<string>()
  for (const team of teams) {
    const name = normalizeTeamName(team.name)
    const nameKey = name.toLocaleLowerCase('hr')
    if (name.length === 0) problems.push({ type: 'nameMissing', teamId: team.id })
    else if ([...name].length > TEAM_NAME_MAX_LENGTH) {
      problems.push({ type: 'nameTooLong', teamId: team.id })
    } else if (names.has(nameKey)) problems.push({ type: 'nameTaken', teamId: team.id })
    names.add(nameKey)

    if (colors.has(team.color)) problems.push({ type: 'colorTaken', teamId: team.id })
    colors.add(team.color)

    if (icons.has(team.icon)) problems.push({ type: 'iconTaken', teamId: team.id })
    icons.add(team.icon)
  }
  return problems
}

/** Spec 4.1: teams × rounds × (time per question + 30 s). */
export function estimatedDurationSeconds(teamCount: number, options: GameOptions): number {
  return (
    teamCount *
    ROUNDS_PER_GAME[options.length] *
    (options.secondsPerQuestion + DURATION_OVERHEAD_SECONDS)
  )
}
