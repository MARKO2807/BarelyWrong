import type { QuestionStatus } from '../../data/batchSchema'
import { t } from '../../i18n'

const STYLES: Record<QuestionStatus, string> = {
  review: 'bg-accent text-on-accent border-accent',
  approved: 'text-correct border-correct',
  rejected: 'text-wrong border-wrong',
  archived: 'text-text-muted border-border',
}

export function StatusBadge({ status }: { status: QuestionStatus }) {
  return (
    <span
      className={`inline-block rounded-full border-2 px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap ${STYLES[status]}`}
    >
      {t(`editor.statuses.${status}`)}
    </span>
  )
}
