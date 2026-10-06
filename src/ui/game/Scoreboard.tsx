import type { CSSProperties } from 'react'
import { getScores, type GameState } from '../../engine'
import { t } from '../../i18n'
import { TeamChip, teamStyle } from './team'

export interface ScoreBubble {
  teamId: string
  points: number
  /** Changes for every new result, so the animation replays. */
  key: number
}

interface ScoreboardProps {
  game: GameState
  /** Teams to highlight: the one on turn, or the one answering. */
  activeTeamIds: readonly string[]
  bubble: ScoreBubble | null
}

export function formatPoints(points: number): string {
  return points > 0 ? `+${points}` : points < 0 ? `−${Math.abs(points)}` : '0'
}

/** Every team's total, always on screen at the bottom. */
export function Scoreboard({ game, activeTeamIds, bubble }: ScoreboardProps) {
  const scores = getScores(game)
  return (
    <ul
      aria-label={t('game.scores')}
      className="grid grid-cols-2 gap-3 lg:grid-cols-(--teams)"
      style={{ '--teams': `repeat(${game.teams.length}, minmax(0, 1fr))` } as CSSProperties}
    >
      {game.teams.map((team, index) => {
        const active = activeTeamIds.includes(team.id)
        return (
          <li
            key={team.id}
            style={teamStyle(team.color)}
            className={`relative flex min-w-0 items-center gap-2 rounded-lg border-2 bg-surface px-2 py-1.5 transition-colors lg:gap-3 lg:px-3 lg:py-2 ${
              active ? 'border-(--team)' : 'border-border'
            }`}
          >
            <TeamChip
              color={team.color}
              icon={team.icon}
              className="size-8 text-xl lg:size-10 lg:text-2xl"
            />
            <span className="min-w-0 flex-1 truncate font-display text-lg font-extrabold lg:text-xl">
              {team.name}
            </span>
            <span className="kbd-hint max-lg:hidden text-text-muted" aria-hidden="true">
              {index + 1}
            </span>
            <span className="font-terminal text-4xl leading-none tabular-nums">
              {scores[team.id]}
            </span>
            {bubble?.teamId === team.id && (
              <span
                key={bubble.key}
                aria-hidden="true"
                className={`score-bubble absolute -top-4 right-3 font-terminal text-5xl ${
                  bubble.points >= 0 ? 'text-correct' : 'text-wrong'
                }`}
              >
                {formatPoints(bubble.points)}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
