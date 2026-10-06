// Computes embeddings for questions that don't have one yet (new in the editor, or edited):
//   npm run embed
import { fetchMissingEmbeddings, saveEmbedding } from '../src/data/editorApi.ts'
import { embeddingText } from '../src/data/import/index.ts'
import { editorClient } from './lib/editor.ts'
import { embed } from './lib/embedder.ts'

const db = await editorClient()
const missing = await fetchMissingEmbeddings(db)
if (missing.length === 0) {
  console.log('Every question has an embedding.')
  process.exit(0)
}
console.log(`Computing ${missing.length} embedding(s)…`)
const vectors = await embed(missing.map((q) => embeddingText(q.question, q.answer)))
for (const [i, q] of missing.entries()) await saveEmbedding(db, q.id, vectors[i]!)
console.log(`Done: ${missing.length} embedding(s) saved.`)
