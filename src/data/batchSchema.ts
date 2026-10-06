import { z } from 'zod'
import { QUESTION_FORMATS, TOPICS } from '../engine'

export const QUESTION_STATUSES = ['review', 'approved', 'rejected', 'archived'] as const
export type QuestionStatus = (typeof QUESTION_STATUSES)[number]

/** `<topic>-<four digits>`, given by the import (spec 9.1). */
export const QUESTION_ID_PATTERN = /^[a-z_]+-\d{4,}$/

/**
 * One question in the import format (docs/SPEC.md 9.1), as written in content/batches. Unknown
 * fields are an error, so a misspelt field name can't be dropped silently. `id` is written into
 * the file by the import; a question without one has not been imported yet.
 */
export const batchQuestionSchema = z.strictObject({
  id: z.string().regex(QUESTION_ID_PATTERN).optional(),
  topic: z.enum(TOPICS),
  format: z.enum(QUESTION_FORMATS),
  difficulty: z.literal([1, 2, 3]),
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  accept: z.array(z.string()).default([]),
  note: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).default([]),
  timeSensitive: z.boolean().default(false),
  origin: z.string().default('own'),
  editorNote: z.string().optional(),
  checkedAt: z.iso.date().optional(),
  status: z.enum(QUESTION_STATUSES).optional(),
})
export type BatchQuestion = z.infer<typeof batchQuestionSchema>

export const batchSchema = z.array(batchQuestionSchema)
