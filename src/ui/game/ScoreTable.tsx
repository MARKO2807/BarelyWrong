import { getScores, getScoresByColumn, type GameState, type ScoreColumn } from '../../engine'
import { t } from '../../i18n'
import { KIND_ICONS } from '../pixel/gameIcons'
import { TeamChip } from './team'

/** Points per team per topic for the rounds played so far, plus Najbrži prst once it happened. */
export function ScoreTable({ game, upToRound }: { game: GameState; upToRound: number }) {
  const columns: ScoreColumn[] = game.rounds.slice(0, upToRound + 1).map((round) => round.kind)
  if (game.results.some((result) => result.type === 'fastestFinger')) columns.push('fastest_finger')
  const table = getScoresByColumn(game)
  const totals = getScores(game)

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-1 text-center">
        <caption className="pb-1 text-left font-display text-lg font-extrabold text-text-muted">
          {t('game.byTopic')}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              {t('game.team')}
            </th>
            {columns.map((column) => {
              const Icon = KIND_ICONS[column]
              return (
                <th
                  key={column}
                  scope="col"
                  title={t(`topics.${column}`)}
                  className="px-1 text-xl text-text-muted"
                >
                  <Icon className="mx-auto" />
                  <span className="sr-only">{t(`topics.${column}`)}</span>
                </th>
              )
            })}
            <th scope="col" className="px-2 font-display text-lg font-extrabold text-text-muted">
              {t('game.total')}
            </th>
          </tr>
        </thead>
        <tbody>
          {game.teams.map((team) => (
            <tr key={team.id} className="bg-surface">
              <th scope="row" className="rounded-l-md px-3 py-1 text-left">
                <span className="flex items-center gap-2 font-display text-lg font-extrabold">
                  <TeamChip color={team.color} className="size-7 text-lg" />
                  <span className="truncate">{team.name}</span>
                </span>
              </th>
              {columns.map((column) => (
                <td key={column} className="px-1 font-terminal text-2xl tabular-nums">
                  {table[team.id]?.[column] ?? 0}
                </td>
              ))}
              <td className="rounded-r-md px-2 font-terminal text-3xl tabular-nums">
                {totals[team.id]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
