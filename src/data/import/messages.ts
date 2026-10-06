import { t } from '../../i18n'
import type { ImportPlan, Issue } from './prepare'

/** One line of the import report. */
export function describeIssue(issue: Issue): string {
  switch (issue.code) {
    case 'invalid':
      return issue.field
        ? t('import.issues.invalid', { field: issue.field, message: issue.message })
        : t('import.issues.invalidItem', { message: issue.message })
    case 'unknownId':
      return t('import.issues.unknownId', { id: issue.id })
    case 'duplicate':
      return t('import.issues.duplicate', { id: issue.id, status: t(`statuses.${issue.status}`) })
    case 'duplicateInBatch':
      return t('import.issues.duplicateInBatch', { number: issue.number })
    case 'answerLimit':
      return t('import.issues.answerLimit', { ids: issue.ids.join(', ') })
    case 'answerRepeated':
      return t('import.issues.answerRepeated', { ids: issue.ids.join(', ') })
    case 'tooLong':
      return t('import.issues.tooLong', { words: issue.words })
    case 'timeWord':
      return t('import.issues.timeWord', { word: issue.word })
    case 'similar':
      return t('import.issues.similar', {
        id: issue.id,
        similarity: Math.round(issue.similarity * 100),
      })
    default:
      return t(`import.issues.${issue.code}`)
  }
}

export function describeFileError(error: string): string {
  return error === 'notJson' ? t('import.fileErrors.notJson') : t('import.fileErrors.notList')
}

export interface PlanSummary {
  insert: number
  skip: number
  errors: number
  warnings: number
  trueFalse: { yes: number; no: number }
}

export function summarizePlan(plan: ImportPlan): PlanSummary {
  const inserting = plan.items.filter((p) => p.action === 'insert')
  const trueFalse = inserting.filter((p) => p.item?.format === 'true_false')
  return {
    insert: inserting.length,
    skip: plan.items.length - inserting.length,
    errors: plan.items.filter((p) => p.issues.some((i) => i.level === 'error')).length,
    warnings: plan.items.filter((p) => p.issues.some((i) => i.level === 'warning')).length,
    trueFalse: {
      yes: trueFalse.filter((p) => p.item?.answer === 'Točno').length,
      no: trueFalse.filter((p) => p.item?.answer === 'Netočno').length,
    },
  }
}
