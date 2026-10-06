import { useState } from 'react'
import { Link } from 'react-router'
import { EDITOR_ROUTES } from '../../app/routes'
import { setReportResolved, type EditorQuestion, type Report } from '../../data/editorApi'
import { t } from '../../i18n'
import { Button } from '../../ui/Button'
import { StatusBadge } from '../../ui/editor/StatusBadge'
import { useEditorData } from './EditorData'

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) return String(error.message)
  return String(error)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('hr-HR')
}

export function SectionTitle({ children }: { children: string }) {
  return <h2 className="font-display text-xl font-extrabold">{children}</h2>
}

/** Questions the embeddings say are close to this one (spec 9.3: duplicate warnings). */
export function SimilarList({ question }: { question: EditorQuestion }) {
  const { similar, byId } = useEditorData()
  const found = similar.get(question.id) ?? []
  if (!question.has_embedding)
    return <p className="text-text-muted">{t('editor.edit.noEmbedding')}</p>
  if (found.length === 0) return <p className="text-text-muted">{t('editor.edit.noSimilar')}</p>
  return (
    <ul className="flex flex-col gap-2">
      {found.map(({ id, similarity }) => {
        const other = byId.get(id)
        return (
          <li key={id} className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-terminal text-lg text-primary-text">
              {Math.round(similarity * 100)} %
            </span>
            <Link to={EDITOR_ROUTES.question(id)} className="font-terminal text-lg underline">
              {id}
            </Link>
            {other && (
              <>
                <StatusBadge status={other.status} />
                <span className="basis-full">
                  {other.question} <span className="text-text-muted">— {other.answer}</span>
                </span>
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** A report from the game, with the button to mark it resolved. */
export function ReportItem({ report, showQuestion }: { report: Report; showQuestion: boolean }) {
  const { db, byId, patchReport } = useEditorData()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const question = byId.get(report.question_id)

  const toggle = () => {
    setBusy(true)
    setError(null)
    setReportResolved(db, report.id, !report.resolved).then(
      () => {
        patchReport(report.id, { resolved: !report.resolved })
        setBusy(false)
      },
      (e: unknown) => {
        setError(t('editor.saveFailed', { message: errorMessage(e) }))
        setBusy(false)
      },
    )
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border-2 border-border bg-surface p-4">
      <p className="flex flex-wrap items-baseline gap-x-3 text-sm text-text-muted">
        <span>{formatDate(report.created_at)}</span>
        <span className="font-semibold text-text">{t(`report.reasons.${report.reason}`)}</span>
        {report.resolved && <span className="text-correct">{t('editor.reports.resolved')}</span>}
      </p>
      {report.comment && <p className="text-lg">„{report.comment}”</p>}
      {showQuestion && (
        <p>
          <Link
            to={EDITOR_ROUTES.question(report.question_id)}
            className="font-terminal text-lg underline"
          >
            {report.question_id}
          </Link>{' '}
          {question ? (
            <>
              {question.question} <span className="text-text-muted">— {question.answer}</span>
            </>
          ) : (
            t('editor.reports.missingQuestion', { id: report.question_id })
          )}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button
          variant={report.resolved ? 'ghost' : 'secondary'}
          size="sm"
          disabled={busy}
          onClick={toggle}
        >
          {report.resolved ? t('editor.reports.reopen') : t('editor.reports.resolve')}
        </Button>
        {error && (
          <p role="alert" className="text-wrong">
            {error}
          </p>
        )}
      </div>
    </li>
  )
}
