import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useBlocker, useNavigate } from 'react-router'
import { useGameSession } from '../app/GameSession'
import { ROUTES } from '../app/routes'
import { useStartGame } from '../app/useStartGame'
import { getCurrentTurn, type GameState } from '../engine'
import { t } from '../i18n'
import { loadGame } from '../storage'
import { Button, ButtonLink } from '../ui/Button'
import { Controls } from '../ui/game/Controls'
import { GameMenu } from '../ui/game/GameMenu'
import { commandForKey } from '../ui/game/keyboard'
import { Scoreboard, type ScoreBubble } from '../ui/game/Scoreboard'
import { ShortageDialog } from '../ui/game/ShortageDialog'
import {
  EndStage,
  FastestFingerIntro,
  LeaderboardStage,
  QuestionStage,
  RoundIntro,
  TeamIntro,
  TiebreakIntro,
} from '../ui/game/stages'
import { TopBar } from '../ui/game/TopBar'
import { useGameSounds } from '../ui/game/useGameSounds'
import { useFullscreen, useWakeLock } from '../ui/hooks'
import { Modal } from '../ui/Modal'
import { PageShell } from '../ui/PageShell'
import { useDocumentTitle } from '../ui/useDocumentTitle'

/** Teams to highlight in the scoreboard. */
function activeTeams(game: GameState): string[] {
  const turn = getCurrentTurn(game)
  if (turn) return [turn.team.id]
  if ('teamId' in game.step && game.step.teamId) return [game.step.teamId]
  if (game.step.type.startsWith('tiebreak')) return game.tiebreak?.teamIds ?? []
  return []
}

/** "+1" over the team that just scored, while the result can still be undone. */
function scoreBubble(game: GameState): ScoreBubble | null {
  if (game.step.type !== 'judged' && game.step.type !== 'fastestFingerJudged') return null
  const result = game.results.at(-1)
  if (!result || result.points === 0) return null
  return { teamId: result.teamId, points: result.points, key: game.results.length }
}

export function GameScreen() {
  useDocumentTitle(t('game.pageTitle'))
  const { game, dispatch, resume, abandon } = useGameSession()
  const navigate = useNavigate()
  const { start, status, shortage, restoreAndStart, dismissShortage } = useStartGame()
  const [menuOpen, setMenuOpen] = useState(false)
  const [hasSaved] = useState(() => loadGame() !== null)
  const triedResume = useRef(false)
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
  const leaving = useRef(false)

  const inProgress = game !== null && game.step.type !== 'finished'

  // Opening /game directly (or after a reload) continues the saved game.
  useEffect(() => {
    if (!game && !triedResume.current) {
      triedResume.current = true
      resume()
    }
  }, [game, resume])

  useGameSounds(game)
  useWakeLock(inProgress)

  // Spec 4.9: leaving mid-game asks first (back button here, closing the tab below).
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      inProgress && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (!inProgress) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [inProgress])

  useEffect(() => {
    if (!game) return
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
      if (document.querySelector('dialog[open]')) return
      const target = event.target
      if (target instanceof Element && target.closest('input, textarea, select')) return
      const command = commandForKey(game, event.key, Date.now())
      if (!command) return
      event.preventDefault()
      // A focused button would also react to the same key when it is released.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      if (command.type === 'action') dispatch(command.action)
      else if (command.type === 'fullscreen') toggleFullscreen()
      else setMenuOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game, dispatch, toggleFullscreen])

  const reveal = useCallback(() => dispatch({ type: 'reveal' }), [dispatch])

  const goTo = (path: string) => {
    leaving.current = true
    navigate(path)
  }

  if (!game) {
    return (
      <PageShell>
        {!hasSaved && (
          <>
            <h1 className="font-display text-4xl font-extrabold">{t('game.noGame')}</h1>
            <ButtonLink to={ROUTES.newGame}>{t('game.newGame')}</ButtonLink>
          </>
        )}
      </PageShell>
    )
  }

  const { step } = game
  let stage: ReactNode
  switch (step.type) {
    case 'roundIntro':
      stage = <RoundIntro game={game} roundIndex={step.round} />
      break
    case 'turnIntro':
      stage = <TeamIntro game={game} />
      break
    case 'leaderboard':
      stage = <LeaderboardStage game={game} roundIndex={step.round} />
      break
    case 'fastestFingerIntro':
      stage = <FastestFingerIntro />
      break
    case 'tiebreakIntro':
      stage = <TiebreakIntro game={game} />
      break
    case 'finished':
      stage = <EndStage game={game} />
      break
    default:
      stage = <QuestionStage game={game} onExpire={reveal} />
  }

  return (
    <div className="grid h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] gap-(--game-gap) bg-bg px-safe-x py-safe-y">
      <TopBar
        game={game}
        isFullscreen={isFullscreen}
        onFullscreen={toggleFullscreen}
        onMenu={() => setMenuOpen(true)}
      />
      <main className="flex min-h-0 items-center justify-center">{stage}</main>
      <footer className="flex flex-col gap-4">
        <Controls
          game={game}
          dispatch={dispatch}
          busy={status === 'loading'}
          onRematch={() => void start({ teams: game.teams, options: game.options })}
          onNewGame={() => goTo(ROUTES.newGame)}
          onHome={() => goTo(ROUTES.home)}
        />
        {step.type !== 'finished' && (
          <Scoreboard game={game} activeTeamIds={activeTeams(game)} bubble={scoreBubble(game)} />
        )}
      </footer>

      <GameMenu
        game={game}
        dispatch={dispatch}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        isFullscreen={isFullscreen}
        onFullscreen={toggleFullscreen}
        onAbort={() => {
          setMenuOpen(false)
          abandon()
          goTo(ROUTES.home)
        }}
      />
      <ShortageDialog
        shortage={shortage}
        busy={status === 'loading'}
        onRestore={restoreAndStart}
        onClose={dismissShortage}
      />
      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title={t('game.leaveTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => blocker.proceed?.()}>
              {t('game.leave')}
            </Button>
            <Button onClick={() => blocker.reset?.()}>{t('game.stay')}</Button>
          </>
        }
      >
        <p>{t('game.leaveText')}</p>
      </Modal>
    </div>
  )
}
