import type { CSSProperties } from 'react'
import {
  getScoresByColumn,
  getTeam,
  type GameState,
  type RankedTeam,
  type ScoreColumn,
} from '../../engine'
import { t } from '../../i18n'
import { KIND_ICONS } from '../pixel/gameIcons'
import { formatPoints } from './Scoreboard'
import { TeamChip } from './team'

interface StandingsProps {
  game: GameState
  ranking: readonly RankedTeam[]
  /** Points per topic are shown for rounds up to this one. */
  upToRound: number
  /** Standings before this round: rows slide from there and show the points just won. */
  previous?: readonly RankedTeam[]
  lastPlaceTeamIds?: readonly string[]
}

/**
 * Ranking and points per topic in one table (spec 4.8). Each row is one element on a subgrid,
 * so it can slide to its new place while staying aligned with the column headers.
 */
export function Standings({
  game,
  ranking,
  upToRound,
  previous,
  lastPlaceTeamIds = [],
}: StandingsProps) {
  const columns: ScoreColumn[] = game.rounds.slice(0, upToRound + 1).map((round) => round.kind)
  const fastestFingerPlayed =
    game.fastestFinger !== null &&
    game.fastestFinger.afterRound < upToRound &&
    game.results.some((result) => result.type === 'fastestFinger')
  if (fastestFingerPlayed) columns.push('fastest_finger')

  const byColumn = getScoresByColumn(game)
  const previousPlace = new Map(previous?.map((entry, index) => [entry.teamId, index]))
  const previousScore = new Map(previous?.map((entry) => [entry.teamId, entry.score]))
  const gridVars = {
    '--topic-count': columns.length,
    '--gained-col': previous ? '3.5rem' : '0rem',
  } as CSSProperties

  return (
    <div className="w-full">
      <div
        role="table"
        aria-label={t('game.byTopic')}
        className="standings-grid gap-y-(--rank-gap)"
        style={gridVars}
      >
        <div
          role="row"
          className="col-span-full grid grid-cols-subgrid items-end border-x-2 border-transparent px-3 text-text-muted"
        >
          <span role="columnheader" className="sr-only">
            #
          </span>
          <span role="columnheader" className="col-start-2 font-display text-lg font-extrabold">
            {t('game.team')}
          </span>
          {columns.map((column) => {
            const Icon = KIND_ICONS[column]
            return (
              <span
                key={column}
                role="columnheader"
                title={t(`topics.${column}`)}
                className="text-center text-xl max-md:hidden"
              >
                <Icon className="mx-auto" />
                <span className="sr-only">{t(`topics.${column}`)}</span>
              </span>
            )
          })}
          {previous && <span role="columnheader" aria-hidden="true" />}
          <span role="columnheader" className="text-right font-display text-lg font-extrabold">
            {t('game.total')}
          </span>
        </div>

        {ranking.map((entry, index) => {
          const team = getTeam(game, entry.teamId)
          const gained = entry.score - (previousScore.get(entry.teamId) ?? 0)
          const last = lastPlaceTeamIds.includes(entry.teamId)
          return (
            <div
              role="row"
              key={`${upToRound}-${entry.teamId}`}
              className="rank-move col-span-full grid grid-cols-subgrid items-center rounded-lg border-2 border-border bg-surface px-3 py-1.5"
              style={
                { '--shift': (previousPlace.get(entry.teamId) ?? index) - index } as CSSProperties
              }
            >
              <span role="cell" className="font-terminal text-3xl text-text-muted">
                {entry.rank}.
              </span>
              <span role="cell" className="flex min-w-0 items-center gap-3">
                <TeamChip color={team.color} className="size-9 text-2xl lg:size-10" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-xl font-extrabold lg:text-2xl">
                    {team.name}
                  </span>
                  {last && (
                    <span className="font-terminal text-xl leading-none text-wrong">
                      {t('game.lastPlace')}
                    </span>
                  )}
                </span>
              </span>
              {columns.map((column) => (
                <span
                  key={column}
                  role="cell"
                  className="text-center font-terminal text-2xl tabular-nums max-md:hidden"
                >
                  {byColumn[team.id]?.[column] ?? 0}
                </span>
              ))}
              {previous && (
                <span
                  role="cell"
                  className={`text-right font-terminal text-2xl ${gained > 0 ? 'text-correct' : gained < 0 ? 'text-wrong' : 'text-text-muted'}`}
                >
                  {gained !== 0 ? formatPoints(gained) : ''}
                </span>
              )}
              <span
                role="cell"
                className="text-right font-terminal text-4xl leading-none tabular-nums"
              >
                {entry.score}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
