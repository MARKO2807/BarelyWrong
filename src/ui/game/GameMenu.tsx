import { useState } from 'react'
import { useSettings } from '../../app/SettingsProvider'
import { canAdjustScores, getScores, type GameAction, type GameState } from '../../engine'
import { t } from '../../i18n'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import { MinusIcon, PlusIcon } from '../icons'
import { Modal } from '../Modal'
import { TeamChip } from './team'

interface GameMenuProps {
  game: GameState
  dispatch: (action: GameAction) => void
  open: boolean
  onClose: () => void
  isFullscreen: boolean
  onFullscreen: () => void
  /** Called after the second confirmation. */
  onAbort: () => void
}

/** Esc menu: continue, full screen, sound, score corrections and abandoning the game (asks twice). */
export function GameMenu({ open, onClose, ...props }: GameMenuProps) {
  return (
    <Modal open={open} onClose={onClose} title={t('game.menu')}>
      <MenuContent onClose={onClose} {...props} />
    </Modal>
  )
}

function MenuContent({
  game,
  dispatch,
  onClose,
  isFullscreen,
  onFullscreen,
  onAbort,
}: Omit<GameMenuProps, 'open'>) {
  const { settings, updateSettings } = useSettings()
  const [confirming, setConfirming] = useState(false)
  const [correcting, setCorrecting] = useState(false)

  return (
    <div className="flex flex-col items-stretch gap-3">
      <Button size="lg" onClick={onClose}>
        {t('game.continue')}
      </Button>
      <Button variant="secondary" size="lg" onClick={onFullscreen}>
        {isFullscreen ? t('game.exitFullscreen') : t('game.fullscreen')}
      </Button>
      <Button
        variant="secondary"
        size="lg"
        onClick={() => updateSettings({ sound: !settings.sound })}
      >
        {settings.sound ? t('game.soundOn') : t('game.soundOff')}
      </Button>
      {canAdjustScores(game) &&
        (correcting ? (
          <ScoreCorrections game={game} dispatch={dispatch} />
        ) : (
          <Button variant="ghost" size="lg" onClick={() => setCorrecting(true)}>
            {t('game.correctScores')}
          </Button>
        ))}
      {confirming ? (
        <div
          role="alertdialog"
          aria-label={t('game.abort')}
          className="flex flex-col gap-3 rounded-md border-2 border-wrong p-4"
        >
          <p className="text-xl font-semibold">{t('game.abortConfirm')}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)} autoFocus>
              {t('common.cancel')}
            </Button>
            <Button variant="wrong" onClick={onAbort}>
              {t('game.abortYes')}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="lg" onClick={() => setConfirming(true)}>
          {t('game.abort')}
        </Button>
      )}
    </div>
  )
}

/** One row per team: score with − and + (spec 4.9). Changes apply at once and are saved. */
function ScoreCorrections({
  game,
  dispatch,
}: {
  game: GameState
  dispatch: (action: GameAction) => void
}) {
  const scores = getScores(game)
  return (
    <section
      aria-label={t('game.correctScores')}
      className="flex flex-col gap-3 rounded-md border-2 border-border p-4"
    >
      <p className="text-text-muted">{t('game.correctScoresText')}</p>
      <ul className="flex flex-col gap-2">
        {game.teams.map((team) => (
          <li key={team.id} className="flex items-center gap-3">
            <TeamChip color={team.color} name={team.name} className="size-9 text-2xl" />
            <span className="min-w-0 flex-1 truncate font-display text-xl font-extrabold">
              {team.name}
            </span>
            <IconButton
              label={t('game.removePoint', { team: team.name })}
              onClick={() => dispatch({ type: 'adjust', teamId: team.id, delta: -1 })}
              className="text-xl"
            >
              <MinusIcon />
            </IconButton>
            <span className="w-12 text-center font-terminal text-3xl" aria-live="polite">
              {scores[team.id] ?? 0}
            </span>
            <IconButton
              label={t('game.addPoint', { team: team.name })}
              onClick={() => dispatch({ type: 'adjust', teamId: team.id, delta: 1 })}
              className="text-xl"
            >
              <PlusIcon />
            </IconButton>
          </li>
        ))}
      </ul>
    </section>
  )
}
