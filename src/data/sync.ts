import {
  enqueue,
  readOutbox,
  removeFromOutbox,
  type NewOutboxItem,
  type OutboxItem,
} from '../storage'
import { supabase } from './supabase'

type AnswerItem = Extract<OutboxItem, { type: 'answer' }>
type ReportItem = Extract<OutboxItem, { type: 'report' }>

/** `sent`; `rejected` when the server refused the data (it will never succeed); `failed` otherwise. */
export type SendResult = 'sent' | 'rejected' | 'failed'

export interface Sender {
  answers: (items: readonly AnswerItem[]) => Promise<SendResult>
  reports: (items: readonly ReportItem[]) => Promise<SendResult>
}

/** Postgres and PostgREST errors carry a code; network failures don't. */
function resultOf(error: { code?: string } | null): SendResult {
  if (!error) return 'sent'
  return error.code && /^(\d|[A-Z]){5}$|^PGRST/.test(error.code) ? 'rejected' : 'failed'
}

const supabaseSender: Sender = {
  answers: async (items) => {
    if (!supabase) return 'failed'
    const { error } = await supabase
      .from('answer_events')
      .insert(items.map((i) => ({ question_id: i.questionId, kind: i.kind, correct: i.correct })))
    return resultOf(error)
  },
  reports: async (items) => {
    if (!supabase) return 'failed'
    const { error } = await supabase
      .from('question_reports')
      .insert(
        items.map((i) => ({ question_id: i.questionId, reason: i.reason, comment: i.comment })),
      )
    return resultOf(error)
  },
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

/** Sends what is waiting; anything that fails stays queued for the next try. */
export async function sendOutbox(items: readonly OutboxItem[], sender: Sender): Promise<string[]> {
  const answers = items.filter((i): i is AnswerItem => i.type === 'answer')
  const reports = items.filter((i): i is ReportItem => i.type === 'report')
  return [
    ...(await sendBatch(answers, sender.answers)),
    ...(await sendBatch(reports, sender.reports)),
  ]
}

let running: Promise<void> | null = null

/** Flushes the queue in the background; safe to call often. */
export function flushOutbox(sender: Sender = supabaseSender): Promise<void> {
  if (!supabase && sender === supabaseSender) return Promise.resolve()
  running ??= (async () => {
    try {
      const items = readOutbox()
      if (items.length > 0 && navigator.onLine !== false)
        removeFromOutbox(await sendOutbox(items, sender))
    } finally {
      running = null
    }
  })()
  return running
}

/** Queues statistics or a report and tries to send right away. */
export function submit(items: readonly NewOutboxItem[]) {
  if (items.length === 0) return
  enqueue(items)
  void flushOutbox()
}

/** Sends the queue now and whenever the connection comes back. Returns a cleanup function. */
export function startOutboxSync(): () => void {
  const flush = () => void flushOutbox()
  flush()
  window.addEventListener('online', flush)
  const timer = window.setInterval(flush, 60_000)
  return () => {
    window.removeEventListener('online', flush)
    window.clearInterval(timer)
  }
}
