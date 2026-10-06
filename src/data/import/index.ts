// Batch import (docs/SPEC.md 9.1), shared by `npm run import` and the editor.

export { describeFileError, describeIssue, summarizePlan, type PlanSummary } from './messages'
export { matchKey, normalizeText, wordCount } from './normalize'
export {
  contentIssues,
  hasErrors,
  itemsToInsert,
  prepareImport,
  todayInCroatia,
  type ExistingQuestion,
  type ImportItem,
  type ImportPlan,
  type Issue,
  type IssueLevel,
  type PlannedItem,
} from './prepare'
export { toImportRow, withAssignedIds, type ImportRow } from './rows'
export {
  SIMILARITY,
  addSimilarity,
  cosineSimilarity,
  embeddingText,
  similarWithinBatch,
  type SimilarMatch,
} from './similarity'
