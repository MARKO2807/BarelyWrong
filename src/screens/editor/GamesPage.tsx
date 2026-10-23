import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  dailyCounts,
  dayOf,
  distributions,
  durationMinutes,
  gameState,
  periodStats,
  type GameState,
  type PeriodStats,
  type Share,
} from '../../data/activityStats'
import {
  deleteGames,
  fetchGames,
  fetchVisitCounts,
  type EditorGame,
  type VisitCount,
} from '../../data/editorApi'
import { SCREENS } from '../../data/screens'
import { t, type MessageKey } from '../../i18n'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { Checkbox, Select } from '../../ui/editor/fields'
import { useEditorData } from './EditorData'
import { SectionTitle, errorMessage } from './parts'

// The activity log (spec 9.4): who plays, how long, where they stop. Loaded on its own, so the
// question pages don't wait for it.

type Period = 'days7' | 'days30' | 'all'
const PERIOD_DAYS: Record<Period, number | null> = { days7: 7, days30: 30, all: null }
const GAME_STATES: GameState[] = ['live', 'finished', 'abandoned', 'unfinished']
const ALL = 'all'
const DAY = 24 * 60 * 60_000

type Loaded = { games: EditorGame[]; visits: VisitCount[]; now: number }
type LoadState = { status: 'loading' } | { status: 'error'; message: string } | Loaded

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('hr-HR', {
    timeZone: 'Europe/Zagreb',
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('hr-HR', {
    timeZone: 'Europe/Zagreb',
    hour: '2-digit',
    minute: '2-digit',
  })

const kindName = (kind: string) => t(`topics.${kind}` as MessageKey)

/** "sub, 18. 10. 18:40 · veliki ekran · duga · 3 tima · 52 min · završena · revanš" */
function gameLine(game: EditorGame, now: number): string {
  const state = gameState(game, now)
  const minutes = durationMinutes(game)
  return [
    formatWhen(game.created_at),
    t(`activity.screens.${game.screen}`),
    t(`activity.lengths.${game.length}`),
    t('editor.games.teams', { count: game.team_count }),
    minutes === null ? null : t('editor.games.minutes', { value: minutes }),
    t(`editor.games.states.${state}`),
    state === 'finished'
      ? null
      : t('editor.games.progress', { done: game.rounds_done, total: game.rounds.length }),
    game.rematch ? t('editor.games.rematch') : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function GamesPage() {
  const { db } = useEditorData()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [period, setPeriod] = useState<Period>('days30')
  const [statusFilter, setStatusFilter] = useState<GameState | typeof ALL>(ALL)
  const [screenFilter, setScreenFilter] = useState<string>(ALL)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [toDelete, setToDelete] = useState<string[] | null>(null)
  const headingId = useId()

  const load = useCallback(() => {
    Promise.all([fetchGames(db), fetchVisitCounts(db)]).then(
      ([games, visits]) => setState({ games, visits, now: Date.now() }),
      (error: unknown) => setState({ status: 'error', message: errorMessage(error) }),
    )
  }, [db])

  useEffect(load, [load])

  const removeGames = useCallback((ids: readonly string[]) => {
    const gone = new Set(ids)
    setState((s) => ('games' in s ? { ...s, games: s.games.filter((g) => !gone.has(g.id)) } : s))
    setSelected((s) => new Set([...s].filter((id) => !gone.has(id))))
  }, [])

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id={headingId} className="font-display text-4xl font-extrabold">
          {t('editor.games.title')}
        </h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setState({ status: 'loading' })
            load()
          }}
        >
          {t('editor.games.refresh')}
        </Button>
      </div>

      {'games' in state ? (
        <GamesContent
          loaded={state}
          period={period}
          onPeriod={setPeriod}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          screenFilter={screenFilter}
          onScreenFilter={setScreenFilter}
          selected={selected}
          onSelected={setSelected}
          onDelete={setToDelete}
        />
      ) : state.status === 'loading' ? (
        <p className="text-xl text-text-muted">{t('editor.games.loading')}</p>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-xl text-wrong">
            {t('editor.loadFailed', { message: state.message })}
          </p>
          <Button onClick={load}>{t('editor.retry')}</Button>
        </div>
      )}

      <DeleteDialog ids={toDelete} onClose={() => setToDelete(null)} onDeleted={removeGames} />
    </section>
  )
}

function GamesContent({
  loaded: { games, visits, now },
  period,
  onPeriod,
  statusFilter,
  onStatusFilter,
  screenFilter,
  onScreenFilter,
  selected,
  onSelected,
  onDelete,
}: {
  loaded: Loaded
  period: Period
  onPeriod: (period: Period) => void
  statusFilter: GameState | typeof ALL
  onStatusFilter: (value: GameState | typeof ALL) => void
  screenFilter: string
  onScreenFilter: (value: string) => void
  selected: ReadonlySet<string>
  onSelected: (ids: ReadonlySet<string>) => void
  onDelete: (ids: string[]) => void
}) {
  const periodId = useId()
  const days = PERIOD_DAYS[period]
  const sinceDay = days === null ? null : dayOf(now - days * DAY)
  const periodGames = useMemo(
    () => games.filter((g) => sinceDay === null || dayOf(g.created_at) > sinceDay),
    [games, sinceDay],
  )
  const periodVisits = useMemo(
    () => visits.filter((v) => sinceDay === null || v.day > sinceDay),
    [visits, sinceDay],
  )
  const live = games.filter((g) => gameState(g, now) === 'live')
  const shown = periodGames.filter(
    (g) =>
      (statusFilter === ALL || gameState(g, now) === statusFilter) &&
      (screenFilter === ALL || g.screen === screenFilter),
  )
  const shares = distributions(periodGames, periodVisits, now)
  const allShownSelected = shown.length > 0 && shown.every((g) => selected.has(g.id))

  return (
    <>
      <div className="flex flex-col gap-3">
        <SectionTitle>{t('editor.games.live')}</SectionTitle>
        {live.length === 0 ? (
          <p className="text-text-muted">{t('editor.games.noLive')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {live.map((g) => (
              <li key={g.id} className="rounded-lg border-2 border-primary px-4 py-2">
                {gameLine(g, now)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>{t('editor.games.numbers')}</SectionTitle>
        <NumbersTable
          columns={(['days7', 'days30', 'all'] as const).map((p) => ({
            label: t(`editor.games.periods.${p}`),
            stats: periodStats(games, visits, PERIOD_DAYS[p], now),
          }))}
        />
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>{t('editor.games.daily')}</SectionTitle>
        <DailyChart days={dailyCounts(games, visits, 30, now)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={periodId} className="font-display text-xl font-extrabold">
          {t('editor.games.period')}
        </h2>
        <SegmentedControl
          name="period"
          labelledBy={periodId}
          value={period}
          options={(['days7', 'days30', 'all'] as const).map((p) => ({
            value: p,
            label: t(`editor.games.periods.${p}`),
          }))}
          onChange={onPeriod}
        />
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>{t('editor.games.shares')}</SectionTitle>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <ShareList
            title={t('editor.games.shareTitles.screens')}
            shares={shares.screens}
            label={(key) => t(`activity.screens.${key as EditorGame['screen']}`)}
          />
          <ShareList
            title={t('editor.games.shareTitles.lengths')}
            shares={shares.lengths}
            label={(key) => t(`activity.lengths.${key as EditorGame['length']}`)}
          />
          <ShareList
            title={t('editor.games.shareTitles.referrers')}
            shares={shares.referrers.slice(0, 8)}
            label={(key) => key || t('editor.games.direct')}
          />
          <ShareList
            title={t('editor.games.shareTitles.stopRounds')}
            shares={shares.stopRounds}
            label={(key) =>
              key === '0'
                ? t('editor.games.afterNoRound')
                : t('editor.games.afterRounds', { count: key })
            }
          />
          <ShareList
            title={t('editor.games.shareTitles.topics')}
            shares={shares.topics}
            label={kindName}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <SectionTitle>{t('editor.games.list')}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Select
            label={t('editor.games.status')}
            value={statusFilter}
            options={[
              { value: ALL, label: t('editor.all') },
              ...GAME_STATES.map((s) => ({ value: s, label: t(`editor.games.states.${s}`) })),
            ]}
            onChange={onStatusFilter}
          />
          <Select
            label={t('editor.games.screen')}
            value={screenFilter}
            options={[
              { value: ALL, label: t('editor.all') },
              ...SCREENS.map((s) => ({ value: s, label: t(`activity.screens.${s}`) })),
            ]}
            onChange={onScreenFilter}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Checkbox
            label={t('editor.games.selectAll')}
            checked={allShownSelected}
            onChange={(checked) =>
              onSelected(
                checked
                  ? new Set([...selected, ...shown.map((g) => g.id)])
                  : new Set([...selected].filter((id) => !shown.some((g) => g.id === id))),
              )
            }
          />
          <Button
            variant="wrong"
            size="sm"
            disabled={selected.size === 0}
            onClick={() => onDelete([...selected])}
          >
            {t('editor.games.deleteSelected', { count: selected.size })}
          </Button>
          <p role="status" className="ml-auto text-text-muted">
            {t('editor.games.count', { count: shown.length })}
          </p>
        </div>
        {shown.length === 0 ? (
          <p className="text-lg text-text-muted">{t('editor.games.empty')}</p>
        ) : (
          <ul className="flex flex-col divide-y-2 divide-border rounded-lg border-2 border-border">
            {shown.map((g) => (
              <GameRow
                key={g.id}
                game={g}
                now={now}
                selected={selected.has(g.id)}
                onSelect={(on) => {
                  const next = new Set(selected)
                  if (on) next.add(g.id)
                  else next.delete(g.id)
                  onSelected(next)
                }}
                onDelete={() => onDelete([g.id])}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function NumbersTable({ columns }: { columns: { label: string; stats: PeriodStats }[] }) {
  const rows: { key: keyof PeriodStats; format: (value: number) => string }[] = [
    { key: 'visits', format: String },
    { key: 'started', format: String },
    { key: 'finished', format: String },
    { key: 'finishedRate', format: (value) => t('editor.games.percent', { value }) },
    { key: 'averageMinutes', format: (value) => t('editor.games.minutes', { value }) },
    { key: 'rematchRate', format: (value) => t('editor.games.percent', { value }) },
  ]
  return (
    <div className="overflow-x-auto rounded-lg border-2 border-border">
      <table className="w-full border-collapse text-left">
        <thead className="bg-surface font-display text-sm font-extrabold">
          <tr>
            <td className="px-3 py-2" />
            {columns.map((c) => (
              <th key={c.label} scope="col" className="px-3 py-2 text-right">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t-2 border-border">
              <th scope="row" className="px-3 py-2 font-semibold">
                {t(`editor.games.stats.${row.key}`)}
              </th>
              {columns.map((c) => {
                const value = c.stats[row.key]
                return (
                  <td
                    key={c.label}
                    className="px-3 py-2 text-right font-terminal text-xl whitespace-nowrap"
                  >
                    {value === null ? '—' : row.format(value)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Two bars per day: visits and games, each scaled to its own maximum. */
function DailyChart({ days }: { days: { day: string; visits: number; games: number }[] }) {
  const maxVisits = Math.max(1, ...days.map((d) => d.visits))
  const maxGames = Math.max(1, ...days.map((d) => d.games))
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-40 items-end gap-0.5 rounded-lg border-2 border-border p-2 sm:gap-1">
        {days.map((d) => {
          const label = t('editor.games.dailyDay', {
            day: d.day.slice(5).split('-').reverse().join('. ') + '.',
            visits: d.visits,
            games: d.games,
          })
          return (
            <div
              key={d.day}
              role="img"
              aria-label={label}
              title={label}
              className="flex h-full min-w-0 flex-1 items-end gap-px"
            >
              <div
                className="flex-1 rounded-t-sm bg-primary"
                style={{ height: `${(d.visits / maxVisits) * 100}%` }}
              />
              <div
                className="flex-1 rounded-t-sm bg-team-cyan"
                style={{ height: `${(d.games / maxGames) * 100}%` }}
              />
            </div>
          )
        })}
      </div>
      <p className="flex gap-6 text-sm text-text-muted">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-primary" />
          {t('editor.games.dailyLegendVisits', { max: Math.max(0, ...days.map((d) => d.visits)) })}
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-team-cyan" />
          {t('editor.games.dailyLegendGames', { max: Math.max(0, ...days.map((d) => d.games)) })}
        </span>
      </p>
    </div>
  )
}

function ShareList({
  title,
  shares,
  label,
}: {
  title: string
  shares: readonly Share[]
  label: (key: string) => string
}) {
  const total = shares.reduce((sum, s) => sum + s.count, 0)
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-display text-lg font-extrabold">{title}</h3>
      {shares.length === 0 ? (
        <p className="text-text-muted">{t('editor.games.noData')}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {shares.map((s) => (
            <li key={s.key} className="flex flex-col gap-0.5">
              <span className="flex justify-between gap-3">
                <span className="truncate">{label(s.key)}</span>
                <span className="font-terminal text-lg">{s.count}</span>
              </span>
              <span className="h-1.5 rounded-full bg-surface">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${(s.count / total) * 100}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function GameRow({
  game,
  now,
  selected,
  onSelect,
  onDelete,
}: {
  game: EditorGame
  now: number
  selected: boolean
  onSelect: (selected: boolean) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const line = gameLine(game, now)
  const doneAt = new Map(game.events.filter((e) => e.event === 'round').map((e) => [e.round, e.at]))
  const yesNo = (value: boolean) => (value ? t('editor.yes') : t('editor.no'))
  return (
    <li className="flex flex-col gap-2 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelect(event.target.checked)}
          aria-label={t('editor.games.select', { when: formatWhen(game.created_at) })}
          className="size-5 accent-(--primary)"
        />
        <span className="min-w-[min(100%,18rem)] flex-1">{line}</span>
        <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? t('editor.games.hideDetails') : t('editor.games.details')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          {t('editor.games.delete')}
        </Button>
      </div>
      {open && (
        <div className="flex flex-col gap-2 pl-8 text-text-muted">
          <p>
            {t('editor.games.settings', {
              seconds: game.seconds_per_question,
              fastestFinger: yesNo(game.fastest_finger),
              theme: t(`settings.theme.${game.theme === 'light' ? 'light' : 'dark'}`),
              sound: yesNo(game.sound),
              timeZone: game.time_zone ?? '?',
            })}
          </p>
          <ol className="grid gap-x-6 sm:grid-cols-2">
            {game.rounds.map((kind, i) => {
              const at = doneAt.get(i + 1)
              const vars = { number: i + 1, kind: kindName(kind) }
              return (
                <li key={i} className={at ? 'text-text' : undefined}>
                  {at
                    ? t('editor.games.roundDone', { ...vars, time: formatTime(at) })
                    : t('editor.games.roundNotDone', vars)}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </li>
  )
}

function DeleteDialog({
  ids,
  onClose,
  onDeleted,
}: {
  ids: string[] | null
  onClose: () => void
  onDeleted: (ids: readonly string[]) => void
}) {
  const { db } = useEditorData()
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const close = () => {
    if (busy) return
    setFailure(null)
    onClose()
  }

  const remove = async () => {
    if (!ids) return
    setBusy(true)
    setFailure(null)
    try {
      await deleteGames(db, ids)
      onDeleted(ids)
      onClose()
    } catch (error) {
      setFailure(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={ids !== null}
      onClose={close}
      title={t('editor.games.confirmTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button variant="wrong" onClick={() => void remove()} disabled={busy}>
            {busy ? t('editor.games.deleting') : t('editor.games.confirm')}
          </Button>
        </>
      }
    >
      <p>{t('editor.games.confirmText', { count: ids?.length ?? 0 })}</p>
      {failure && (
        <p role="alert" className="mt-3 text-wrong">
          {t('editor.games.deleteFailed', { message: failure })}
        </p>
      )}
    </Modal>
  )
}
