import { z } from 'zod'
import { QUESTION_FORMATS, TOPICS } from '../engine'

/** One question in the import format (docs/SPEC.md 9.1), as written in content/batches. */
export const batchQuestionSchema = z.object({
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
  checkedAt: z.string().optional(),
  status: z.enum(['review', 'approved', 'rejected', 'archived']).optional(),
})
export type BatchQuestion = z.infer<typeof batchQuestionSchema>

export const batchSchema = z.array(batchQuestionSchema)
