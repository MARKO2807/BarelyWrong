import type { EditorGame, VisitCount } from './editorApi'
import { todayInCroatia } from './import'

// Numbers for the editor's Games page (spec 9.4), from the raw games and visit counts.

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
/** A game started this recently and not over yet is being played right now. */
export const LIVE_MINUTES = 30

export type GameState = 'live' | 'finished' | 'abandoned' | 'unfinished'

export function gameState(game: EditorGame, now: number): GameState {
  if (game.status !== 'open') return game.status
  return now - Date.parse(game.created_at) < LIVE_MINUTES * MINUTE ? 'live' : 'unfinished'
}

/** From the start to the last finished round (or the end); null before the first round ends. */
export function durationMinutes(game: EditorGame): number | null {
  if (!game.last_event_at) return null
  return Math.round((Date.parse(game.last_event_at) - Date.parse(game.created_at)) / MINUTE)
}

/** The day in Croatia (YYYY-MM-DD) of a moment. */
export const dayOf = (time: number | string) => todayInCroatia(new Date(time))

export interface PeriodStats {
  visits: number
  started: number
  finished: number
  /** Percent of started games that were finished; null without games. */
  finishedRate: number | null
  /** Average length of finished games, in minutes. */
  averageMinutes: number | null
  rematchRate: number | null
}

const percent = (part: number, whole: number) =>
  whole === 0 ? null : Math.round((part / whole) * 100)

/** Games and visits of the last `days` days, today included (null: all time). */
export function periodStats(
  games: readonly EditorGame[],
  visits: readonly VisitCount[],
  days: number | null,
  now: number,
): PeriodStats {
  const sinceDay = days === null ? null : dayOf(now - days * DAY)
  const inPeriod = games.filter((g) => sinceDay === null || dayOf(g.created_at) > sinceDay)
  const finished = inPeriod.filter((g) => g.status === 'finished')
  const minutes = finished.map(durationMinutes).filter((m): m is number => m !== null)
  return {
    visits: visits
      .filter((v) => sinceDay === null || v.day > sinceDay)
      .reduce((sum, v) => sum + v.visits, 0),
    started: inPeriod.length,
    finished: finished.length,
    finishedRate: percent(finished.length, inPeriod.length),
    averageMinutes:
      minutes.length === 0
        ? null
        : Math.round(minutes.reduce((sum, m) => sum + m, 0) / minutes.length),
    rematchRate: percent(inPeriod.filter((g) => g.rematch).length, inPeriod.length),
  }
}

export interface DayCount {
  day: string
  visits: number
  games: number
}

/** Visits and games for each of the last `days` days, oldest first (days without any count 0). */
export function dailyCounts(
  games: readonly EditorGame[],
  visits: readonly VisitCount[],
  days: number,
  now: number,
): DayCount[] {
  const result = Array.from({ length: days }, (_, i) => ({
    day: dayOf(now - (days - 1 - i) * DAY),
    visits: 0,
    games: 0,
  }))
  const byDay = new Map(result.map((d) => [d.day, d]))
  for (const v of visits) {
    const d = byDay.get(v.day)
    if (d) d.visits += v.visits
  }
  for (const g of games) {
    const d = byDay.get(dayOf(g.created_at))
    if (d) d.games++
  }
  return result
}

export interface Share {
  key: string
  count: number
}

function countBy<T>(
  items: readonly T[],
  keyOf: (item: T) => string[],
  weight?: (item: T) => number,
) {
  const counts = new Map<string, number>()
  for (const item of items)
    for (const key of keyOf(item)) counts.set(key, (counts.get(key) ?? 0) + (weight?.(item) ?? 1))
  return [...counts]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

export interface Distributions {
  screens: Share[]
  lengths: Share[]
  /** Referrer hosts of visits; '' for direct visits. */
  referrers: Share[]
  /** Rounds completed by games that were not finished (live games left out). */
  stopRounds: Share[]
  /** Round kinds that were played to the end. */
  topics: Share[]
  /** Browser languages of visits ('' when unknown). */
  languages: Share[]
}

export function distributions(
  games: readonly EditorGame[],
  visits: readonly VisitCount[],
  now: number,
): Distributions {
  const stopped = games.filter((g) => ['abandoned', 'unfinished'].includes(gameState(g, now)))
  return {
    screens: countBy(games, (g) => [g.screen]),
    lengths: countBy(games, (g) => [g.length]),
    referrers: countBy(
      visits,
      (v) => [v.referrer ?? ''],
      (v) => v.visits,
    ),
    stopRounds: countBy(stopped, (g) => [String(g.rounds_done)]).sort(
      (a, b) => Number(a.key) - Number(b.key),
    ),
    topics: countBy(games, (g) => g.rounds.slice(0, g.rounds_done)),
    languages: countBy(
      visits,
      (v) => [v.language ?? ''],
      (v) => v.visits,
    ),
  }
}
