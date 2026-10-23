import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { fetchCandidates, fetchIdsOfKinds } from '../data/questions'
import { createGame, type GameSetup, type Shortage, type ShortageKind } from '../engine'
import { getPlayedIds, saveLastSetup, unmarkPlayed } from '../storage'
import { useGameSession } from './GameSession'
import { ROUTES } from './routes'

export interface ShortageState {
  setup: GameSetup
  shortages: Shortage[]
  /** Played questions were already brought back and it still isn't enough. */
  afterRestore: boolean
  rematch: boolean
}

/** Creates a game from a setup (new game or rematch) and opens the game screen. */
export function useStartGame() {
  const { begin } = useGameSession()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'loading' | 'failed'>('idle')
  const [shortage, setShortage] = useState<ShortageState | null>(null)

  const start = useCallback(
    async (setup: GameSetup, restore: readonly ShortageKind[] = [], rematch = false) => {
      setStatus('loading')
      try {
        if (restore.length > 0) unmarkPlayed(await fetchIdsOfKinds(getPlayedIds(), restore))
        const playedIds = getPlayedIds()
        const pool = await fetchCandidates({ teamCount: setup.teams.length, playedIds })
        const result = createGame({ ...setup, pool, playedIds, rng: Math.random })
        setStatus('idle')
        if (!result.ok) {
          setShortage({
            setup,
            shortages: result.shortages,
            afterRestore: restore.length > 0,
            rematch,
          })
          return
        }
        setShortage(null)
        saveLastSetup(setup)
        begin(result.game, rematch)
        navigate(ROUTES.game)
      } catch {
        setStatus('failed')
      }
    },
    [begin, navigate],
  )

  const restoreAndStart = useCallback(() => {
    if (shortage)
      void start(
        shortage.setup,
        shortage.shortages.map((s) => s.kind),
        shortage.rematch,
      )
  }, [shortage, start])

  const dismissShortage = useCallback(() => setShortage(null), [])

  return { start, status, shortage, restoreAndStart, dismissShortage }
}
