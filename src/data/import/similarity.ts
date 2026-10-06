import type { ImportPlan, Issue } from './prepare'

/**
 * Cosine similarity of question embeddings (spec 8.5): from `likely` a probable duplicate, from
 * `possible` worth a look. Measured on multilingual-e5-small (2026-10-06): paraphrases of the same
 * question 0.945–0.988, different questions on the same subject up to 0.943, unrelated pilot
 * questions up to 0.906. Tune as real imports come in.
 */
export const SIMILARITY = { likely: 0.96, possible: 0.93 } as const

export interface SimilarMatch {
  /** A database id, or `#n` for question n of the same file. */
  id: string
  similarity: number
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    normA += a[i]! * a[i]!
    normB += b[i]! * b[i]!
  }
  return normA === 0 || normB === 0 ? 0 : dot / Math.sqrt(normA * normB)
}

/**
 * Pairs within one file that are at least `possible` similar: for each question, the earlier
 * questions it resembles (so every pair is reported once, on the later question).
 */
export function similarWithinBatch(
  embeddings: ReadonlyMap<number, readonly number[]>,
): Map<number, SimilarMatch[]> {
  const result = new Map<number, SimilarMatch[]>()
  const entries = [...embeddings].sort(([a], [b]) => a - b)
  entries.forEach(([index, embedding], position) => {
    for (const [otherIndex, other] of entries.slice(0, position)) {
      const similarity = cosineSimilarity(embedding, other)
      if (similarity >= SIMILARITY.possible)
        result.set(index, [...(result.get(index) ?? []), { id: `#${otherIndex + 1}`, similarity }])
    }
  })
  return result
}

/**
 * Adds similarity findings to a plan. A likely duplicate is an error unless `allowLikely` (the
 * editor looked and the questions are different after all); a possible one is a warning.
 */
export function addSimilarity(
  plan: ImportPlan,
  matches: ReadonlyMap<number, readonly SimilarMatch[]>,
  { allowLikely = false }: { allowLikely?: boolean } = {},
): ImportPlan {
  return {
    ...plan,
    items: plan.items.map((planned) => {
      const found = (matches.get(planned.index) ?? []).filter(
        (m) => m.similarity >= SIMILARITY.possible,
      )
      if (found.length === 0) return planned
      const issues: Issue[] = found
        .sort((a, b) => b.similarity - a.similarity)
        .map((m) => ({
          level: m.similarity >= SIMILARITY.likely && !allowLikely ? 'error' : 'warning',
          code: 'similar',
          id: m.id,
          similarity: m.similarity,
        }))
      return { ...planned, issues: [...planned.issues, ...issues] }
    }),
  }
}

/** The text an embedding is computed from: the question together with its answer. */
export function embeddingText(question: string, answer: string): string {
  return `${question} — ${answer}`
}
