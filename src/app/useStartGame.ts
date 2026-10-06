import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { fetchQuestions } from '../data/questions'
import {
  createGame,
  questionFitsKind,
  type GameSetup,
  type Shortage,
  type ShortageKind,
} from '../engine'
import { getPlayedIds, saveLastSetup, unmarkPlayed } from '../storage'
import { useGameSession } from './GameSession'
import { ROUTES } from './routes'

export interface ShortageState {
  setup: GameSetup
  shortages: Shortage[]
  /** Played questions were already brought back and it still isn't enough. */
  afterRestore: boolean
}

/** Creates a game from a setup (new game or rematch) and opens the game screen. */
export function useStartGame() {
  const { begin } = useGameSession()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'loading' | 'failed'>('idle')
  const [shortage, setShortage] = useState<ShortageState | null>(null)

  const start = useCallback(
    async (setup: GameSetup, restore: readonly ShortageKind[] = []) => {
      setStatus('loading')
      try {
        const pool = await fetchQuestions()
        if (restore.length > 0) {
          unmarkPlayed(
            pool.filter((q) => restore.some((kind) => questionFitsKind(q, kind))).map((q) => q.id),
          )
        }
        const result = createGame({ ...setup, pool, playedIds: getPlayedIds(), rng: Math.random })
        setStatus('idle')
        if (!result.ok) {
          setShortage({ setup, shortages: result.shortages, afterRestore: restore.length > 0 })
          return
        }
        setShortage(null)
        saveLastSetup(setup)
        begin(result.game)
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
      )
  }, [shortage, start])

  const dismissShortage = useCallback(() => setShortage(null), [])

  return { start, status, shortage, restoreAndStart, dismissShortage }
}
