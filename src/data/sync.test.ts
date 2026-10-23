// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enqueue, readOutbox, type OutboxItem } from '../storage'
import { flushOutbox, sendOutbox, type Sender } from './sync'

const answer = (questionId: string): OutboxItem => ({
  type: 'answer',
  id: questionId,
  questionId,
  kind: 'turn',
  correct: true,
})
const report = (questionId: string): OutboxItem => ({
  type: 'report',
  id: `r-${questionId}`,
  questionId,
  reason: 'unclear',
  comment: null,
})

const start = (gameId: string): OutboxItem => ({
  type: 'gameStart',
  id: `s-${gameId}`,
  gameId,
  teamCount: 2,
  length: 'full',
  secondsPerQuestion: 60,
  fastestFinger: true,
  rounds: ['sport', 'estimate'],
  rematch: false,
  screen: 'large',
  timeZone: 'Europe/Zagreb',
  theme: 'dark',
  sound: false,
  windowWidth: 1920,
  windowHeight: 1080,
  language: 'hr-HR',
})
const progress = (gameId: string, round: number): OutboxItem => ({
  type: 'gameProgress',
  id: `p-${gameId}-${round}`,
  gameId,
  event: 'round',
  round,
  turn: 0,
})
const visit: OutboxItem = {
  type: 'visit',
  id: 'v',
  path: '/',
  screen: 'phone',
  referrer: null,
  timeZone: null,
  windowWidth: null,
  windowHeight: null,
  language: null,
}

function sender(behaviour: (ids: string[]) => 'sent' | 'rejected' | 'failed'): Sender & {
  calls: string[][]
} {
  const calls: string[][] = []
  const send = async (items: readonly OutboxItem[]) => {
    const ids = items.map((i) => ('questionId' in i ? i.questionId : i.id))
    calls.push(ids)
    return behaviour(ids)
  }
  return { answer: send, report: send, visit: send, gameStart: send, gameProgress: send, calls }
}

beforeEach(() => {
  localStorage.clear()
})

describe('sendOutbox', () => {
  it('sends answers and reports in one batch each', async () => {
    const s = sender(() => 'sent')
    const done = await sendOutbox([answer('a'), answer('b'), report('c')], s)
    expect(done).toEqual(['a', 'b', 'r-c'])
    expect(s.calls).toEqual([['a', 'b'], ['c']])
  })

  it('keeps everything when the network fails', async () => {
    expect(
      await sendOutbox(
        [answer('a'), report('b')],
        sender(() => 'failed'),
      ),
    ).toEqual([])
  })

  it('drops only the rows the server refuses', async () => {
    const s = sender((ids) => (ids.includes('gone') ? 'rejected' : 'sent'))
    const done = await sendOutbox([answer('a'), answer('gone'), answer('b')], s)
    expect(done).toEqual(['a', 'gone', 'b'])
    expect(s.calls).toEqual([['a', 'gone', 'b'], ['a'], ['gone'], ['b']])
  })

  it('keeps a row whose single retry fails', async () => {
    let first = true
    const s = sender(() => {
      if (first) {
        first = false
        return 'rejected'
      }
      return 'failed'
    })
    expect(await sendOutbox([answer('a'), answer('b')], s)).toEqual([])
  })
})

describe('activity', () => {
  it('sends a game start before its progress, and visits', async () => {
    const s = sender(() => 'sent')
    const done = await sendOutbox([progress('g', 1), visit, start('g')], s)
    expect(s.calls).toEqual([['s-g'], ['p-g-1'], ['v']])
    expect(done).toEqual(['s-g', 'p-g-1', 'v'])
  })

  it('keeps the progress of a game whose start did not get through', async () => {
    const s = sender((ids) => (ids.includes('s-g') ? 'failed' : 'sent'))
    const done = await sendOutbox([start('g'), progress('g', 1), progress('h', 2)], s)
    expect(done).toEqual(['p-h-2'])
  })
})

describe('flushOutbox', () => {
  it('sends items queued during a send right after it, not a minute later', async () => {
    enqueue([{ type: 'answer', questionId: 'a', kind: 'turn', correct: true }])
    let release: () => void = () => {}
    const sent: string[][] = []
    const sender: Sender = {
      answer: async (items) => {
        sent.push(items.map((i) => i.questionId))
        if (sent.length === 1) await new Promise<void>((resolve) => (release = resolve))
        return 'sent'
      },
      report: async () => 'sent',
      visit: async () => 'sent',
      gameStart: async () => 'sent',
      gameProgress: async () => 'sent',
    }
    const first = flushOutbox(sender)
    await new Promise((r) => setTimeout(r, 0))
    enqueue([{ type: 'answer', questionId: 'b', kind: 'turn', correct: true }])
    const second = flushOutbox(sender)
    release()
    await Promise.all([first, second])
    expect(sent).toEqual([['a'], ['b']])
    expect(readOutbox()).toEqual([])
  })
})

describe('outbox', () => {
  it('queues items and removes what was sent', async () => {
    enqueue([
      { type: 'answer', questionId: 'x', kind: 'fastest_finger', correct: false },
      { type: 'report', questionId: 'y', reason: 'wrong', comment: 'Krivi odgovor' },
    ])
    expect(readOutbox()).toHaveLength(2)
    const sent = vi.fn(async () => 'sent' as const)
    const failed = vi.fn(async () => 'failed' as const)
    await flushOutbox({
      answer: sent,
      report: failed,
      visit: sent,
      gameStart: sent,
      gameProgress: sent,
    })
    expect(readOutbox().map((i) => i.type)).toEqual(['report'])
  })
})
