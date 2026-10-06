import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { gameReducer, getShownQuestionId, type GameAction, type GameState } from '../engine'
import { clearGame, loadGame, markPlayed, saveGame } from '../storage'

interface GameSessionValue {
  game: GameState | null
  dispatch: (action: GameAction) => void
  /** Starts a freshly created game (new or rematch). */
  begin: (game: GameState) => void
  /** Loads the saved game, paused where it was left. Returns false when there is none. */
  resume: () => boolean
  /** Prekini partiju: deletes the game for good. */
  abandon: () => void
}

const GameSessionContext = createContext<GameSessionValue | null>(null)

/**
 * Glue between the engine and the browser: every change is saved, questions are marked as
 * played the moment they appear, and a closing tab saves the game with its clock paused.
 * Statistics (getCommittedAnswerEvents) are sent from phase 4.
 */
export function GameSessionProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<GameState | null>(null)
  const current = useRef<GameState | null>(null)

  const apply = useCallback((next: GameState | null) => {
    current.current = next
    setGame(next)
    if (next) saveGame(next)
  }, [])

  const dispatch = useCallback(
    (action: GameAction) => {
      const previous = current.current
      if (!previous) return
      const next = gameReducer(previous, action)
      if (next === previous) return
      const shown = getShownQuestionId(previous, next)
      if (shown) markPlayed([shown])
      apply(next)
    },
    [apply],
  )

  const begin = useCallback((next: GameState) => apply(next), [apply])

  const resume = useCallback(() => {
    const saved = loadGame()
    if (!saved) return false
    apply(gameReducer(saved.game, { type: 'pause', now: saved.savedAt }))
    return true
  }, [apply])

  const abandon = useCallback(() => {
    current.current = null
    setGame(null)
    clearGame()
  }, [])

  useEffect(() => {
    const saveOnLeave = () => {
      const latest = current.current
      if (latest) saveGame(gameReducer(latest, { type: 'pause', now: Date.now() }))
    }
    window.addEventListener('pagehide', saveOnLeave)
    return () => window.removeEventListener('pagehide', saveOnLeave)
  }, [])

  const value = useMemo(
    () => ({ game, dispatch, begin, resume, abandon }),
    [game, dispatch, begin, resume, abandon],
  )
  return <GameSessionContext value={value}>{children}</GameSessionContext>
}

export function useGameSession(): GameSessionValue {
  const context = useContext(GameSessionContext)
  if (!context) throw new Error('useGameSession must be used inside <GameSessionProvider>')
  return context
}
