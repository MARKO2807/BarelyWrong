import { z } from 'zod'
import { REPORT_REASONS } from '../data/reports'
import { SCREENS } from '../data/screens'
import { GAME_LENGTHS, ROUND_KINDS, SECONDS_PER_QUESTION_OPTIONS } from '../engine'
import { STORED } from './keys'
import { THEMES } from './settings'
import { readStored, writeStored, type StoredValue } from './versioned'

// Statistics, reports and the activity log wait here until they reach the server, so nothing is
// lost offline.

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
  z.object({
    type: z.literal('visit'),
    id: z.string(),
    path: z.string().min(1).max(200),
    screen: z.enum(SCREENS),
    referrer: z.string().min(1).max(200).nullable(),
    timeZone: z.string().min(1).max(64).nullable(),
  }),
  z.object({
    type: z.literal('gameStart'),
    id: z.string(),
    gameId: z.string(),
    teamCount: z.number().int().min(2).max(4),
    length: z.enum(GAME_LENGTHS),
    secondsPerQuestion: z.literal(SECONDS_PER_QUESTION_OPTIONS),
    fastestFinger: z.boolean(),
    rounds: z.array(z.enum(ROUND_KINDS)).min(1).max(12),
    rematch: z.boolean(),
    screen: z.enum(SCREENS),
    timeZone: z.string().min(1).max(64).nullable(),
    theme: z.enum(THEMES),
    sound: z.boolean(),
  }),
  z.object({
    type: z.literal('gameProgress'),
    id: z.string(),
    gameId: z.string(),
    event: z.enum(['round', 'finished', 'abandoned']),
    round: z.number().int().min(0).max(12),
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

const stored: StoredValue<OutboxItem[]> = {
  ...STORED.outbox,
  schema: z.array(outboxItemSchema),
  // v1 → v2: new kinds of items; the old ones keep their shape.
  migrations: { 1: (data) => data },
}

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
