// Sentence embeddings for duplicate search (spec 8.5): multilingual-e5-small, run locally, no API
// key. The model (about 120 MB) is downloaded on first use into .cache/models.
import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'
import { join } from 'node:path'

const MODEL = 'Xenova/multilingual-e5-small'
/** Matches `vector(384)` in the database. */
export const EMBEDDING_SIZE = 384

env.cacheDir = join(import.meta.dirname, '..', '..', '.cache', 'models')

let extractor: Promise<FeatureExtractionPipeline> | null = null

/** One normalized vector per text. e5 expects the `query: ` prefix for symmetric comparison. */
export async function embed(texts: readonly string[]): Promise<number[][]> {
  extractor ??= pipeline('feature-extraction', MODEL, { dtype: 'q8' })
  const model = await extractor
  const result: number[][] = []
  for (let i = 0; i < texts.length; i += 32) {
    const batch = texts.slice(i, i + 32).map((text) => `query: ${text}`)
    const output = await model(batch, { pooling: 'mean', normalize: true })
    result.push(...(output.tolist() as number[][]))
  }
  return result
}
