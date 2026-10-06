import { describe, expect, it } from 'vitest'
import { questionSchema } from '../engine'
import { questionsFromBatch } from './questions'

// Checks the real question files, so a broken batch fails the build instead of a game night.

const files = import.meta.glob<unknown>('../../content/batches/*.json', {
  import: 'default',
  eager: true,
})

describe('content/batches', () => {
  const questions = Object.entries(files).flatMap(([path, data]) => questionsFromBatch(path, data))

  it('has question files', () => {
    expect(Object.keys(files).length).toBeGreaterThan(0)
  })

  it('turns every file into valid game questions', () => {
    for (const question of questions) expect(questionSchema.safeParse(question).success).toBe(true)
  })

  it('gives every question a unique id', () => {
    const ids = questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has a note for every question', () => {
    expect(questions.filter((q) => !q.note).map((q) => q.id)).toEqual([])
  })

  it('writes true/false questions the agreed way', () => {
    for (const q of questions.filter((q) => q.format === 'true_false')) {
      expect(q.question.startsWith('Točno ili netočno:')).toBe(true)
      expect(['Točno', 'Netočno']).toContain(q.answer)
    }
  })
})
