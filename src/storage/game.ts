import { z } from 'zod'
import { gameStateSchema, type GameState } from '../engine'
import { STORED } from './keys'
import { readStored, removeStored, writeStored, type StoredValue } from './versioned'

// The game in progress, saved after every action so it survives a closed browser.

const savedGameSchema = z.object({
  /** When it was saved; on resume, a running timer is paused at this moment. */
  savedAt: z.number(),
  /** Random id of this game in the editor's activity log (game_starts.id). */
  id: z.string(),
  game: gameStateSchema,
})
export type SavedGame = z.infer<typeof savedGameSchema>

const stored: StoredValue<SavedGame> = {
  ...STORED.game,
  schema: savedGameSchema,
  migrations: {
    // v2 → v3: games keep the host's score corrections.
    2: (data) => {
      const saved = data as { savedAt: unknown; game: object }
      return {
        ...saved,
        game: { ...saved.game, adjustments: {} },
      }
    },
    // v3 → v4: games get an id for the activity log.
    3: (data) => ({ ...(data as object), id: crypto.randomUUID() }),
  },
}

export function saveGame(game: GameState, id: string, now: number = Date.now()): boolean {
  return writeStored(stored, { savedAt: now, id, game })
}

/** The saved game, or null. A damaged save is thrown away. */
export function loadGame(): SavedGame | null {
  const saved = readStored(stored)
  if (saved === undefined) {
    removeStored(stored)
    return null
  }
  return saved
}

export function clearGame(): boolean {
  return removeStored(stored)
}

/** For "Nastavi partiju" on the home screen. */
export function hasUnfinishedGame(): boolean {
  const saved = loadGame()
  return saved !== null && saved.game.step.type !== 'finished'
}
