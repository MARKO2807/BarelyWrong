import { describe, expect, it } from 'vitest'
import {
  dailyCounts,
  distributions,
  durationMinutes,
  gameState,
  liveProgress,
  periodStats,
} from './activityStats'
import type { EditorGame, VisitCount } from './editorApi'

// Noon in Croatia, 23 October 2026.
const NOW = Date.parse('2026-10-23T10:00:00Z')
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()
const daysAgo = (d: number) => minutesAgo(d * 24 * 60)

function game(patch: Partial<EditorGame>): EditorGame {
  return {
    id: 'g',
    created_at: minutesAgo(60),
    team_count: 3,
    length: 'full',
    seconds_per_question: 60,
    fastest_finger: true,
    rounds: ['sport', 'music', 'estimate'],
    rematch: false,
    screen: 'large',
    time_zone: 'Europe/Zagreb',
    theme: 'dark',
    sound: false,
    rounds_done: 0,
    status: 'open',
    last_event_at: null,
    events: [],
    ...patch,
  }
}

const visit = (day: string, visits: number, referrer: string | null = null): VisitCount => ({
  day,
  screen: 'phone',
  referrer,
  visits,
})

describe('gameState', () => {
  it('tells live games from unfinished ones by their last move', () => {
    expect(gameState(game({ created_at: minutesAgo(10) }), NOW)).toBe('live')
    expect(gameState(game({ created_at: minutesAgo(45) }), NOW)).toBe('unfinished')
    expect(gameState(game({ created_at: minutesAgo(50), last_event_at: minutesAgo(2) }), NOW)).toBe(
      'live',
    )
    expect(gameState(game({ status: 'finished' }), NOW)).toBe('finished')
    expect(gameState(game({ status: 'abandoned' }), NOW)).toBe('abandoned')
  })
})

describe('liveProgress', () => {
  const turn = (round: number, n: number) => ({ event: 'turn' as const, round, turn: n, at: '' })

  it('shows the round after the finished ones and the question after the judged ones', () => {
    expect(liveProgress(game({ team_count: 3 }))).toEqual({
      round: 1,
      rounds: 3,
      question: 1,
      questions: 3,
      kind: 'sport',
    })
    const later = game({
      team_count: 3,
      rounds_done: 1,
      events: [turn(1, 1), turn(1, 2), turn(1, 3), turn(2, 1)],
    })
    expect(liveProgress(later)).toMatchObject({ round: 2, question: 2, kind: 'music' })
  })

  it('stays on the last round and question at the end', () => {
    const end = game({ team_count: 2, rounds_done: 3, events: [turn(3, 1), turn(3, 2)] })
    expect(liveProgress(end)).toMatchObject({ round: 3, question: 2 })
  })
})

describe('durationMinutes', () => {
  it('runs from the start to the last event', () => {
    expect(
      durationMinutes(game({ created_at: minutesAgo(52), last_event_at: minutesAgo(0) })),
    ).toBe(52)
    expect(durationMinutes(game({}))).toBeNull()
  })
})

describe('periodStats', () => {
  const games = [
    game({ status: 'finished', created_at: minutesAgo(60), last_event_at: minutesAgo(10) }),
    game({ status: 'finished', created_at: daysAgo(3), last_event_at: daysAgo(3), rematch: true }),
    game({ status: 'abandoned', created_at: daysAgo(20) }),
  ]
  const visits = [visit('2026-10-23', 5), visit('2026-10-20', 3), visit('2026-09-01', 10)]

  it('counts the last 7 days', () => {
    expect(periodStats(games, visits, 7, NOW)).toEqual({
      visits: 8,
      started: 2,
      finished: 2,
      finishedRate: 100,
      averageMinutes: 25,
      rematchRate: 50,
    })
  })

  it('counts all time', () => {
    const all = periodStats(games, visits, null, NOW)
    expect(all).toMatchObject({ visits: 18, started: 3, finished: 2, finishedRate: 67 })
  })

  it('has no rates without games', () => {
    expect(periodStats([], [], 30, NOW)).toMatchObject({ finishedRate: null, averageMinutes: null })
  })
})

describe('dailyCounts', () => {
  it('fills every day, oldest first', () => {
    const days = dailyCounts(
      [game({ created_at: minutesAgo(60) }), game({ created_at: daysAgo(1) })],
      [visit('2026-10-23', 4), visit('2026-10-21', 2), visit('2026-01-01', 9)],
      3,
      NOW,
    )
    expect(days).toEqual([
      { day: '2026-10-21', visits: 2, games: 0 },
      { day: '2026-10-22', visits: 0, games: 1 },
      { day: '2026-10-23', visits: 4, games: 1 },
    ])
  })
})

describe('distributions', () => {
  it('counts screens, referrers, where games stopped and played topics', () => {
    const d = distributions(
      [
        game({ status: 'finished', rounds_done: 3, screen: 'laptop' }),
        game({ status: 'abandoned', rounds_done: 1 }),
        game({ rounds_done: 2, created_at: minutesAgo(120) }),
        game({ rounds_done: 1, created_at: minutesAgo(5) }),
      ],
      [visit('2026-10-23', 3, 'www.google.com'), visit('2026-10-22', 5)],
      NOW,
    )
    expect(d.screens).toEqual([
      { key: 'large', count: 3 },
      { key: 'laptop', count: 1 },
    ])
    expect(d.referrers).toEqual([
      { key: '', count: 5 },
      { key: 'www.google.com', count: 3 },
    ])
    expect(d.stopRounds).toEqual([
      { key: '1', count: 1 },
      { key: '2', count: 1 },
    ])
    expect(d.topics[0]).toEqual({ key: 'sport', count: 4 })
    expect(d.languages).toEqual([{ key: '', count: 8 }])
  })
})
