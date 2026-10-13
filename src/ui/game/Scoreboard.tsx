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
      className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-(--teams) short:grid-cols-(--teams) short:gap-2"
      style={{ '--teams': `repeat(${game.teams.length}, minmax(0, 1fr))` } as CSSProperties}
    >
      {game.teams.map((team) => {
        const active = activeTeamIds.includes(team.id)
        return (
          <li
            key={team.id}
            style={teamStyle(team.color)}
            // The team on turn is filled with its colour; the others carry a thick stripe of it.
            className={`relative flex min-w-0 items-center gap-2 rounded-lg border-2 border-l-[0.6rem] border-(--team) px-2 py-1.5 transition-colors duration-300 lg:gap-3 lg:px-3 lg:py-2 short:border-l-[0.4rem] short:py-1 ${
              active ? 'scoreboard-active bg-(--team) text-(--on-team-color)' : 'bg-surface'
            }`}
          >
            <TeamChip
              color={team.color}
              name={team.name}
              className="size-7 text-lg sm:size-8 sm:text-xl lg:size-10 lg:text-2xl short:size-6 short:text-base"
            />
            <span className="min-w-0 flex-1 truncate font-display text-base font-extrabold sm:text-lg lg:text-xl short:text-sm">
              {team.name}
            </span>
            <span className="font-display text-3xl leading-none font-extrabold tabular-nums sm:text-4xl short:text-2xl">
              {scores[team.id]}
            </span>
            {bubble?.teamId === team.id && (
              <span
                key={bubble.key}
                aria-hidden="true"
                className={`score-bubble absolute -top-5 right-3 font-display text-5xl font-extrabold ${
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
