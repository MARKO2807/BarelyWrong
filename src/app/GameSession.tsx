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
import { recordAbandon, recordGameStart, recordProgress } from '../data/activity'
import { startOutboxSync, submit } from '../data/sync'
import {
  gameReducer,
  getCommittedAnswerEvents,
  getCompletedRounds,
  getProgressEvents,
  getShownQuestionId,
  type GameAction,
  type GameState,
} from '../engine'
import { clearGame, loadGame, markPlayed, saveGame, type GameLog } from '../storage'

interface GameSessionValue {
  game: GameState | null
  dispatch: (action: GameAction) => void
  /** Starts a freshly created game (new or rematch). */
  begin: (game: GameState, rematch: boolean) => void
  /** Loads the saved game, paused where it was left. Returns false when there is none. */
  resume: () => boolean
  /** Prekini partiju: deletes the game for good. */
  abandon: () => void
}

const GameSessionContext = createContext<GameSessionValue | null>(null)

/**
 * Glue between the engine and the browser: every change is saved, questions are marked as
 * played the moment they appear, and a closing tab saves the game with its clock paused.
 * Answers go to the statistics queue once the game moves on, so Undo never has to take them back.
 * The start, every finished round, the end and Prekini partiju go to the editor's activity log.
 */
export function GameSessionProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<GameState | null>(null)
  const current = useRef<GameState | null>(null)
  /** Id of the current game in the activity log; saved with the game. */
  /** This game's place in the activity log; saved with the game. */
  const log = useRef<GameLog>({ id: '', tracked: false })

  const apply = useCallback((next: GameState | null) => {
    current.current = next
    setGame(next)
    if (next) saveGame(next, log.current)
  }, [])

  const dispatch = useCallback(
    (action: GameAction) => {
      const previous = current.current
      if (!previous) return
      const next = gameReducer(previous, action)
      if (next === previous) return
      const shown = getShownQuestionId(previous, next)
      if (shown) markPlayed([shown])
      submit(
        getCommittedAnswerEvents(previous, next).map((event) => ({
          type: 'answer' as const,
          ...event,
        })),
      )
      if (log.current.tracked) recordProgress(log.current.id, getProgressEvents(previous, next))
      apply(next)
    },
    [apply],
  )

  const begin = useCallback(
    (next: GameState, rematch: boolean) => {
      const id = crypto.randomUUID()
      log.current = { id, tracked: recordGameStart(id, next, rematch) }
      apply(next)
    },
    [apply],
  )

  const resume = useCallback(() => {
    const saved = loadGame()
    if (!saved) return false
    log.current = { id: saved.id, tracked: saved.tracked }
    apply(gameReducer(saved.game, { type: 'pause', now: saved.savedAt }))
    return true
  }, [apply])

  const abandon = useCallback(() => {
    const latest = current.current
    if (latest && latest.step.type !== 'finished')
      if (log.current.tracked) recordAbandon(log.current.id, getCompletedRounds(latest))
    current.current = null
    setGame(null)
    clearGame()
  }, [])

  useEffect(() => startOutboxSync(), [])

  useEffect(() => {
    const saveOnLeave = () => {
      const latest = current.current
      if (latest) saveGame(gameReducer(latest, { type: 'pause', now: Date.now() }), log.current)
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
