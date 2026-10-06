import { z } from 'zod'
import { MAX_TEAMS, gameOptionsSchema, teamSchema, type GameSetup } from '../engine'
import { STORED } from './keys'
import { withTeamIcons } from './teamIcons'
import { readStored, writeStored, type StoredValue } from './versioned'

// The last teams and game options, so the setup screen starts where the previous game did.

const lastSetupSchema = z.object({
  teams: z.array(teamSchema).max(MAX_TEAMS),
  options: gameOptionsSchema,
})

const stored: StoredValue<GameSetup> = {
  ...STORED.lastSetup,
  schema: lastSetupSchema,
  migrations: {
    // v1 → v2: an icon for every team.
    1: (data) => {
      const setup = data as { teams: unknown[] }
      return { ...setup, teams: withTeamIcons(setup.teams) }
    },
  },
}

export function loadLastSetup(): GameSetup | null {
  return readStored(stored) ?? null
}

export function saveLastSetup(setup: GameSetup): boolean {
  return writeStored(stored, setup)
}
