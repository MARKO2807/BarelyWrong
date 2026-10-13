import type { ReactNode } from 'react'
import {
  canUndo,
  getChallenger,
  getCurrentTurn,
  getTeam,
  getTimer,
  isTimerRunning,
  type GameAction,
  type GameState,
  type Team,
} from '../../engine'
import { t } from '../../i18n'
import { Button } from '../Button'
import { teamStyle } from './team'

interface ControlsProps {
  game: GameState
  dispatch: (action: GameAction) => void
  onRematch: () => void
  onNewGame: () => void
  onHome: () => void
  /** A rematch is being prepared. */
  busy: boolean
}

function Key({ children }: { children: ReactNode }) {
  return (
    <span className="kbd-hint max-md:hidden" aria-hidden="true">
      {children}
    </span>
  )
}

const now = () => Date.now()

/** The host's buttons for the current step; the same actions as the keyboard shortcuts. */
export function Controls({ game, dispatch, onRematch, onNewGame, onHome, busy }: ControlsProps) {
  const { step } = game
  const act = (action: GameAction) => () => dispatch(action)

  const next = (
    <Button size="lg" className="btn-next" onClick={act({ type: 'next' })}>
      {t('game.next')} <Key>{t('game.keys.space')}</Key>
    </Button>
  )
  const start = (
    <Button size="lg" onClick={() => dispatch({ type: 'start', now: now() })}>
      {t('game.start')} <Key>{t('game.keys.space')}</Key>
    </Button>
  )
  const reveal = (
    <Button size="lg" onClick={act({ type: 'reveal' })}>
      {t('game.reveal')} <Key>{t('game.keys.space')}</Key>
    </Button>
  )
  const undo = canUndo(game) && (
    <Button variant="ghost" size="lg" onClick={() => dispatch({ type: 'undo', now: now() })}>
      {t('game.undo')} <Key>Z</Key>
    </Button>
  )
  const timer = getTimer(game)
  const pause = timer && (
    <Button
      variant="secondary"
      size="lg"
      onClick={() => dispatch({ type: isTimerRunning(timer) ? 'pause' : 'resume', now: now() })}
    >
      {isTimerRunning(timer) ? t('game.pause') : t('game.resume')} <Key>P</Key>
    </Button>
  )
  const judge = (correctLabel: string, wrongLabel: string) => (
    <>
      <Button variant="wrong" size="lg" onClick={act({ type: 'judge', correct: false })}>
        {wrongLabel} <Key>N</Key>
      </Button>
      <Button variant="correct" size="lg" onClick={act({ type: 'judge', correct: true })}>
        {correctLabel} <Key>T</Key>
      </Button>
    </>
  )
  /** Team buttons; keys 1–4 follow the team list. */
  const teamButtons = (teams: readonly Team[], action: (team: Team) => GameAction) =>
    teams.map((team) => (
      <Button
        key={team.id}
        variant="team"
        size="lg"
        style={teamStyle(team.color)}
        onClick={() => dispatch(action(team))}
      >
        {team.name} <Key>{game.teams.indexOf(team) + 1}</Key>
      </Button>
    ))
  const prompt = (text: string) => (
    <span className="w-full text-center text-2xl font-semibold md:w-auto">{text}</span>
  )

  let content: ReactNode
  switch (step.type) {
    case 'roundIntro':
    case 'leaderboard':
      content = next
      break
    case 'turnIntro':
    case 'fastestFingerIntro':
    case 'tiebreakIntro':
      content = start
      break
    case 'question':
    case 'tiebreakQuestion':
      content = (
        <>
          {pause}
          {reveal}
        </>
      )
      break
    case 'answer': {
      const turn = getCurrentTurn(game)!
      content =
        turn.round.kind === 'estimate' ? (
          <>
            {prompt(t('game.whoGetsPoint'))}
            {teamButtons([turn.team, getChallenger(game, turn.team.id)], (team) => ({
              type: 'award',
              teamId: team.id,
            }))}
          </>
        ) : (
          judge(t('game.correct'), t('game.wrong'))
        )
      break
    }
    case 'judged':
    case 'fastestFingerJudged':
      content = (
        <>
          {undo}
          {next}
        </>
      )
      break
    case 'fastestFingerQuestion':
      content = (
        <>
          {prompt(t('game.whoFirst'))}
          {teamButtons(game.teams, (team) => ({ type: 'buzz', teamId: team.id, now: now() }))}
          {pause}
          {reveal}
        </>
      )
      break
    case 'fastestFingerBuzzed':
      content = (
        <>
          {undo}
          {reveal}
        </>
      )
      break
    case 'fastestFingerAnswer':
      content =
        step.teamId === null ? next : judge(`${t('game.correct')} +2`, `${t('game.wrong')} −1`)
      break
    case 'tiebreakAnswer':
      content = (
        <>
          {prompt(t('game.closest'))}
          {teamButtons(
            (game.tiebreak?.teamIds ?? []).map((id) => getTeam(game, id)),
            (team) => ({ type: 'award', teamId: team.id }),
          )}
        </>
      )
      break
    case 'finished':
      content = (
        <>
          {undo}
          <Button variant="ghost" size="lg" onClick={onHome}>
            {t('common.backHome')}
          </Button>
          <Button variant="secondary" size="lg" onClick={onNewGame}>
            {t('game.newGame')}
          </Button>
          <Button size="lg" onClick={onRematch} disabled={busy}>
            {busy ? t('setup.starting') : t('game.rematch')}
          </Button>
        </>
      )
      break
  }

  return <div className="flex flex-wrap items-center justify-center gap-3">{content}</div>
}
