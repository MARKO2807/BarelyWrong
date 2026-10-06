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

function sender(behaviour: (ids: string[]) => 'sent' | 'rejected' | 'failed'): Sender & {
  calls: string[][]
} {
  const calls: string[][] = []
  const send = async (items: readonly OutboxItem[]) => {
    const ids = items.map((i) => i.questionId)
    calls.push(ids)
    return behaviour(ids)
  }
  return { answers: send, reports: send, calls }
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

describe('outbox', () => {
  it('queues items and removes what was sent', async () => {
    enqueue([
      { type: 'answer', questionId: 'x', kind: 'fastest_finger', correct: false },
      { type: 'report', questionId: 'y', reason: 'wrong', comment: 'Krivi odgovor' },
    ])
    expect(readOutbox()).toHaveLength(2)
    const answers = vi.fn(async () => 'sent' as const)
    const reports = vi.fn(async () => 'failed' as const)
    await flushOutbox({ answers, reports })
    expect(readOutbox().map((i) => i.type)).toEqual(['report'])
  })
})
