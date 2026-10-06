import { describeIssue, type Issue } from '../../data/import'
import { t } from '../../i18n'

/** Findings of the import checks: errors first, each marked with its level. */
export function IssueList({ issues, empty }: { issues: readonly Issue[]; empty?: string }) {
  if (issues.length === 0) return empty ? <p className="text-correct">{empty}</p> : null
  const sorted = [...issues].sort((a, b) =>
    a.level === b.level ? 0 : a.level === 'error' ? -1 : 1,
  )
  return (
    <ul className="flex flex-col gap-1">
      {sorted.map((issue, index) => (
        <li key={index} className="flex gap-2">
          <span
            className={`shrink-0 font-semibold ${issue.level === 'error' ? 'text-wrong' : 'text-primary-text'}`}
          >
            {t(`import.levels.${issue.level}`)}:
          </span>
          <span>{describeIssue(issue)}</span>
        </li>
      ))}
    </ul>
  )
}
