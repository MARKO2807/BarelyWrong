// Imports a batch of questions (docs/SPEC.md 9.1):
//   npm run import -- content/batches/<file>.json [--dry-run] [--allow-similar]
// Checks the format and the writing rules, looks for duplicates (also by meaning, with
// embeddings), then writes everything in one transaction and records the new ids in the file.
// --dry-run only prints the report. --allow-similar turns likely duplicates into warnings, for
// when the editor has looked and the questions are different after all.
import { readFileSync, writeFileSync } from 'node:fs'
import { format, resolveConfig } from 'prettier'
import { fetchEditorQuestions, importRows, matchQuestions } from '../src/data/editorApi.ts'
import {
  SIMILARITY,
  addSimilarity,
  describeFileError,
  describeIssue,
  embeddingText,
  hasErrors,
  itemsToInsert,
  prepareImport,
  similarWithinBatch,
  summarizePlan,
  toImportRow,
  todayInCroatia,
  withAssignedIds,
  type ImportPlan,
  type SimilarMatch,
} from '../src/data/import/index.ts'
import { t } from '../src/i18n/index.ts'
import { editorClient } from './lib/editor.ts'
import { embed } from './lib/embedder.ts'

const args = process.argv.slice(2)
const file = args.find((arg) => !arg.startsWith('--'))
const dryRun = args.includes('--dry-run')
const allowSimilar = args.includes('--allow-similar')
if (!file) {
  console.error('Usage: npm run import -- <file> [--dry-run] [--allow-similar]')
  process.exit(1)
}

function printReport(plan: ImportPlan) {
  for (const planned of plan.items) {
    if (planned.issues.length === 0) continue
    const title = t('import.item', { number: planned.index + 1 })
    console.log(`\n${title}: ${planned.question.slice(0, 80)}`)
    for (const issue of planned.issues)
      console.log(`  ${t(`import.levels.${issue.level}`)}: ${describeIssue(issue)}`)
  }
  const { trueFalse, ...counts } = summarizePlan(plan)
  console.log(`\n${t('import.summary', counts)}`)
  if (trueFalse.yes + trueFalse.no > 0) console.log(t('import.trueFalseBalance', trueFalse))
}

let data: unknown
try {
  data = JSON.parse(readFileSync(file, 'utf8'))
} catch {
  console.error(describeFileError('notJson'))
  process.exit(1)
}

const db = await editorClient()
const existing = await fetchEditorQuestions(db)
let plan = prepareImport(data, existing, todayInCroatia())
if (plan.fileError) {
  console.error(describeFileError(plan.fileError))
  process.exit(1)
}

// Duplicates by meaning: against the database and within the file.
const candidates = itemsToInsert(plan)
const vectors = await embed(candidates.map((p) => embeddingText(p.item.question, p.item.answer)))
const embeddings = new Map(candidates.map((p, i) => [p.index, vectors[i]!]))
const matches = similarWithinBatch(embeddings)
for (const [index, embedding] of embeddings) {
  const stored: SimilarMatch[] = await matchQuestions(db, embedding, SIMILARITY.possible)
  matches.set(index, [...stored, ...(matches.get(index) ?? [])])
}
plan = addSimilarity(plan, matches, { allowLikely: allowSimilar })

printReport(plan)
if (hasErrors(plan)) {
  console.error(`\n${t('import.blocked')}`)
  process.exit(1)
}
if (candidates.length === 0) {
  console.log(t('import.nothingNew'))
  process.exit(0)
}
if (dryRun) {
  console.log('\n--dry-run: nothing was written.')
  process.exit(0)
}

const assignedByRow = await importRows(
  db,
  candidates.map((p) => toImportRow(p.item, embeddings.get(p.index))),
)
const assigned = new Map(candidates.map((p, row) => [p.index, assignedByRow.get(row)!]))
const updated = withAssignedIds(data as unknown[], assigned)
const options = { ...(await resolveConfig(file)), parser: 'json' }
writeFileSync(file, await format(JSON.stringify(updated, null, 2), options))

console.log(`\n${t('import.done', { count: assigned.size })}`)
console.log([...assigned.values()].join(', '))
console.log(`Ids written to ${file}.`)
