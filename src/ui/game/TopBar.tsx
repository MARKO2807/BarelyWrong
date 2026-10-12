import { getCurrentRoundIndex, type GameState, type ScoreColumn } from '../../engine'
import { t } from '../../i18n'
import { ExitFullscreenIcon, FullscreenIcon, KIND_ICONS, MenuIcon } from '../icons'
import { DoubleTroubleBadge } from './stages'

interface TopBarProps {
  game: GameState
  isFullscreen: boolean
  onFullscreen: () => void
  onMenu: () => void
}

/** Which kind of question is on: the round's kind, Najbrži prst, or the tiebreak estimate. */
function currentKind(game: GameState): ScoreColumn | null {
  const roundIndex = getCurrentRoundIndex(game)
  if (roundIndex !== null) return game.rounds[roundIndex]!.kind
  if (game.step.type.startsWith('fastestFinger')) return 'fastest_finger'
  if (game.step.type.startsWith('tiebreak')) return 'estimate'
  return null
}

/** Round (3/12), topic with its icon and the Double trouble badge; big full screen and menu buttons on the right. */
export function TopBar({ game, isFullscreen, onFullscreen, onMenu }: TopBarProps) {
  const roundIndex = getCurrentRoundIndex(game)
  const kind = currentKind(game)
  const Icon = kind ? KIND_ICONS[kind] : null
  const doubled = roundIndex !== null && game.rounds[roundIndex]!.doubled

  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1">
        {roundIndex !== null && (
          <span className="font-terminal text-3xl text-text-muted">
            {t('game.round', { current: roundIndex + 1, total: game.rounds.length })}
          </span>
        )}
        {kind && Icon && (
          <span className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <Icon className="text-primary-text" />
            {t(`topics.${kind}`)}
          </span>
        )}
        {doubled && <DoubleTroubleBadge />}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          className="game-top-btn"
          aria-label={isFullscreen ? t('game.exitFullscreen') : t('game.fullscreen')}
          title={isFullscreen ? t('game.exitFullscreen') : t('game.fullscreen')}
          onClick={onFullscreen}
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>
        <button type="button" className="game-top-btn" title={t('game.menu')} onClick={onMenu}>
          <MenuIcon />
          <span className="max-md:sr-only">{t('game.menu')}</span>
        </button>
      </div>
    </header>
  )
}
