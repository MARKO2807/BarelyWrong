import {
  enqueue,
  readOutbox,
  removeFromOutbox,
  type NewOutboxItem,
  type OutboxItem,
} from '../storage'
import { supabase } from './supabase'

export type ItemOf<K extends OutboxItem['type']> = Extract<OutboxItem, { type: K }>

/** `sent`; `rejected` when the server refused the data (it will never succeed); `failed` otherwise. */
export type SendResult = 'sent' | 'rejected' | 'failed'

/** One function per kind of item, each sending a batch of that kind. */
export type Sender = {
  [K in OutboxItem['type']]: (items: readonly ItemOf<K>[]) => Promise<SendResult>
}

/** Postgres and PostgREST errors carry a code; network failures don't. */
function resultOf(error: { code?: string } | null): SendResult {
  if (!error) return 'sent'
  return error.code && /^(\d|[A-Z]){5}$|^PGRST/.test(error.code) ? 'rejected' : 'failed'
}

async function insert(table: string, rows: object[]): Promise<SendResult> {
  if (!supabase) return 'failed'
  const { error } = await supabase.from(table).insert(rows)
  return resultOf(error)
}

const deviceColumns = (i: ItemOf<'visit' | 'gameStart'>) => ({
  window_width: i.windowWidth,
  window_height: i.windowHeight,
  language: i.language,
})

const supabaseSender: Sender = {
  visit: (items) =>
    insert(
      'visits',
      items.map((i) => ({
        path: i.path,
        screen: i.screen,
        referrer: i.referrer,
        time_zone: i.timeZone,
        ...deviceColumns(i),
      })),
    ),
  gameStart: (items) =>
    insert(
      'game_starts',
      items.map((i) => ({
        id: i.gameId,
        team_count: i.teamCount,
        length: i.length,
        seconds_per_question: i.secondsPerQuestion,
        fastest_finger: i.fastestFinger,
        rounds: i.rounds,
        rematch: i.rematch,
        screen: i.screen,
        time_zone: i.timeZone,
        theme: i.theme,
        sound: i.sound,
        ...deviceColumns(i),
      })),
    ),
  gameProgress: (items) =>
    insert(
      'game_progress',
      items.map((i) => ({ game_id: i.gameId, event: i.event, round: i.round, turn: i.turn })),
    ),
  answer: (items) =>
    insert(
      'answer_events',
      items.map((i) => ({ question_id: i.questionId, kind: i.kind, correct: i.correct })),
    ),
  report: (items) =>
    insert(
      'question_reports',
      items.map((i) => ({ question_id: i.questionId, reason: i.reason, comment: i.comment })),
    ),
}

/**
 * Sends a batch; if the server rejects it, retries one by one so a single bad row (for example a
 * question that no longer exists) doesn't hold back the rest. Returns the ids that are done.
 */
async function sendBatch<T extends OutboxItem>(
  items: readonly T[],
  send: (items: readonly T[]) => Promise<SendResult>,
): Promise<string[]> {
  if (items.length === 0) return []
  const result = await send(items)
  if (result === 'sent') return items.map((i) => i.id)
  if (result === 'failed') return []
  if (items.length === 1) return [items[0]!.id]
  const done: string[] = []
  for (const item of items) {
    const single = await send([item])
    if (single !== 'failed') done.push(item.id)
  }
  return done
}

const ofType = <K extends OutboxItem['type']>(items: readonly OutboxItem[], type: K) =>
  items.filter((i): i is ItemOf<K> => i.type === type)

/**
 * Sends what is waiting; anything that fails stays queued for the next try. A game's progress
 * waits until its start is in the database (otherwise the database would refuse it for good).
 */
export async function sendOutbox(items: readonly OutboxItem[], sender: Sender): Promise<string[]> {
  const starts = ofType(items, 'gameStart')
  const sentStarts = await sendBatch(starts, sender.gameStart)
  const waiting = new Set(starts.filter((s) => !sentStarts.includes(s.id)).map((s) => s.gameId))
  const progress = ofType(items, 'gameProgress').filter((p) => !waiting.has(p.gameId))
  return [
    ...sentStarts,
    ...(await sendBatch(progress, sender.gameProgress)),
    ...(await sendBatch(ofType(items, 'visit'), sender.visit)),
    ...(await sendBatch(ofType(items, 'answer'), sender.answer)),
    ...(await sendBatch(ofType(items, 'report'), sender.report)),
  ]
}

let running: Promise<void> | null = null
/** Items were queued while a send was running: send again right after it. */
let again = false

/** Flushes the queue in the background; safe to call often. */
export function flushOutbox(sender: Sender = supabaseSender): Promise<void> {
  if (!supabase && sender === supabaseSender) return Promise.resolve()
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    try {
      do {
        again = false
        const items = readOutbox()
        if (items.length > 0 && navigator.onLine !== false)
          removeFromOutbox(await sendOutbox(items, sender))
      } while (again)
    } finally {
      running = null
    }
  })()
  return running
}

/** Queues statistics, a report or activity and tries to send right away. */
export function submit(items: readonly NewOutboxItem[]) {
  if (items.length === 0) return
  enqueue(items)
  void flushOutbox()
}

/**
 * Sends the queue now, whenever the connection comes back, every minute and when the page is
 * hidden or closed (a private window loses what it did not send). Returns a cleanup function.
 */
export function startOutboxSync(): () => void {
  const flush = () => void flushOutbox()
  const flushWhenHidden = () => {
    if (document.visibilityState === 'hidden') flush()
  }
  flush()
  window.addEventListener('online', flush)
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', flushWhenHidden)
  const timer = window.setInterval(flush, 60_000)
  return () => {
    window.removeEventListener('online', flush)
    window.removeEventListener('pagehide', flush)
    document.removeEventListener('visibilitychange', flushWhenHidden)
    window.clearInterval(timer)
  }
}
