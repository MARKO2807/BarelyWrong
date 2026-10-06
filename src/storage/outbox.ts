import { z } from 'zod'
import { STORED } from './keys'
import { readStored, writeStored, type StoredValue } from './versioned'

// Statistics and reports wait here until they reach the server, so nothing is lost offline.

export const REPORT_REASONS = ['wrong', 'unclear', 'outdated', 'too_hard', 'other'] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

const outboxItemSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('answer'),
    id: z.string(),
    questionId: z.string(),
    kind: z.enum(['turn', 'fastest_finger']),
    correct: z.boolean(),
  }),
  z.object({
    type: z.literal('report'),
    id: z.string(),
    questionId: z.string(),
    reason: z.enum(REPORT_REASONS),
    comment: z.string().max(500).nullable(),
  }),
])
export type OutboxItem = z.infer<typeof outboxItemSchema>

/** Without an id, as callers create them. */
export type NewOutboxItem = OutboxItem extends infer T
  ? T extends OutboxItem
    ? Omit<T, 'id'>
    : never
  : never

/** Keeps the queue bounded if the server stays unreachable for a very long time. */
const MAX_ITEMS = 2000

const stored: StoredValue<OutboxItem[]> = { ...STORED.outbox, schema: z.array(outboxItemSchema) }

export function readOutbox(): OutboxItem[] {
  return readStored(stored) ?? []
}

export function enqueue(items: readonly NewOutboxItem[]): boolean {
  if (items.length === 0) return true
  const added = items.map((item) => ({ ...item, id: crypto.randomUUID() }) as OutboxItem)
  return writeStored(stored, [...readOutbox(), ...added].slice(-MAX_ITEMS))
}

/** Removes items that were sent (or can never be sent). */
export function removeFromOutbox(ids: Iterable<string>): boolean {
  const done = new Set(ids)
  return writeStored(
    stored,
    readOutbox().filter((item) => !done.has(item.id)),
  )
}
