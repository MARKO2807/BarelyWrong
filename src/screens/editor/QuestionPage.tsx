import { useEffect, useId, useMemo, useState } from 'react'
import {
  Link,
  useBlocker,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'
import { EDITOR_ROUTES } from '../../app/routes'
import type { QuestionStatus } from '../../data/batchSchema'
import { saveQuestion, type EditorQuestion } from '../../data/editorApi'
import {
  correctRate,
  draftIssues,
  hasError,
  toChanges,
  toDraft,
  type QuestionDraft,
} from '../../data/editorChecks'
import { QUESTION_FORMATS, TOPICS } from '../../engine'
import { t, tList, type MessageKey } from '../../i18n'
import { Button } from '../../ui/Button'
import { Select, TextArea, TextInput } from '../../ui/editor/fields'
import { IssueList } from '../../ui/editor/IssueList'
import { StatusBadge } from '../../ui/editor/StatusBadge'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { Toggle } from '../../ui/Toggle'
import { useEditorData } from './EditorData'
import { errorMessage, formatDate, ReportItem, SectionTitle, SimilarList } from './parts'

/** Edit every field of one question (spec 9.3). `?from=pregled` returns to the review. */
export function QuestionPage() {
  const { id = '' } = useParams()
  const { byId } = useEditorData()
  const question = byId.get(id)
  if (!question) {
    return <p className="text-xl text-wrong">{t('editor.edit.notFound', { id })}</p>
  }
  // A new key resets the form when moving to another question.
  return <QuestionForm key={question.id} question={question} />
}

const STATUS_ACTIONS: { status: QuestionStatus; label: MessageKey }[] = [
  { status: 'approved', label: 'editor.actions.approve' },
  { status: 'review', label: 'editor.actions.toReview' },
  { status: 'rejected', label: 'editor.actions.reject' },
  { status: 'archived', label: 'editor.actions.archive' },
]

function QuestionForm({ question }: { question: EditorQuestion }) {
  const { db, questions, reports, today, patchQuestion } = useEditorData()
  const [params] = useSearchParams()
  const fromReview = params.get('from') === 'pregled'
  const backTo = fromReview
    ? `${EDITOR_ROUTES.review}?id=${encodeURIComponent(question.id)}`
    : EDITOR_ROUTES.questions
  const navigate = useNavigate()
  const location = useLocation()
  const [draft, setDraft] = useState<QuestionDraft>(() => toDraft(question))
  const [saved, setSaved] = useState<QuestionDraft>(draft)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const difficultyId = useId()
  const timeSensitiveId = useId()

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !busy && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    // A native confirm is enough for a one-person tool.
    if (window.confirm(t('editor.edit.leaveUnsaved'))) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  const issues = useMemo(
    () => draftIssues(question.id, draft, questions, today),
    [question.id, draft, questions, today],
  )
  const questionReports = reports.filter((r) => r.question_id === question.id)
  const update = (patch: Partial<QuestionDraft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setMessage(null)
  }

  const save = (status: QuestionStatus = draft.status) => {
    const next = { ...draft, status }
    const changes = toChanges(next)
    setBusy(true)
    setMessage(null)
    saveQuestion(db, question.id, changes).then(
      () => {
        const textChanged =
          changes.question !== question.question || changes.answer !== question.answer
        patchQuestion(question.id, {
          ...changes,
          has_embedding: question.has_embedding && !textChanged,
          updated_at: new Date().toISOString(),
        })
        const cleaned = toDraft({ ...question, ...changes })
        setDraft(cleaned)
        setSaved(cleaned)
        setBusy(false)
        setMessage({ ok: true, text: t('editor.edit.saved') })
      },
      (error: unknown) => {
        setBusy(false)
        setMessage({ ok: false, text: t('editor.saveFailed', { message: errorMessage(error) }) })
      },
    )
  }

  const blockedApproval = hasError(issues)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          to={backTo}
          onClick={(event) => {
            // Back to the list as it was (filters live in its URL), unless this page was opened directly.
            if (!fromReview && location.key !== 'default') {
              event.preventDefault()
              void navigate(-1)
            }
          }}
          className="rounded-sm text-text-muted underline"
        >
          ← {fromReview ? t('editor.review.title') : t('editor.edit.back')}
        </Link>
        <h1 className="font-display text-3xl font-extrabold">
          {t('editor.edit.title', { id: question.id })}
        </h1>
        <StatusBadge status={question.status} />
      </div>
      <p className="-mt-4 text-sm text-text-muted">
        {t('editor.edit.meta', {
          created: formatDate(question.created_at),
          updated: formatDate(question.updated_at),
        })}{' '}
        · {t('editor.fields.origin')}: {question.origin}
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label={t('editor.fields.topic')}
              value={draft.topic}
              options={TOPICS.map((topic) => ({ value: topic, label: t(`topics.${topic}`) }))}
              onChange={(topic) => update({ topic })}
            />
            <Select
              label={t('editor.fields.format')}
              value={draft.format}
              options={QUESTION_FORMATS.map((f) => ({ value: f, label: t(`editor.formats.${f}`) }))}
              onChange={(format) => update({ format })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span id={difficultyId} className="font-display text-base font-extrabold">
              {t('editor.fields.difficulty')}
            </span>
            <SegmentedControl
              name="difficulty"
              labelledBy={difficultyId}
              value={String(draft.difficulty)}
              options={tList('editor.difficulties').map((label, i) => ({
                value: String(i + 1),
                label,
              }))}
              onChange={(value) => update({ difficulty: Number(value) as 1 | 2 | 3 })}
            />
          </div>
          <TextArea
            label={t('editor.fields.question')}
            value={draft.question}
            onChange={(event) => update({ question: event.target.value })}
            required
          />
          <TextInput
            label={t('editor.fields.answer')}
            value={draft.answer}
            onChange={(event) => update({ answer: event.target.value })}
            required
          />
          <TextArea
            label={t('editor.fields.accept')}
            hint={t('editor.fields.acceptHint')}
            value={draft.accept}
            rows={2}
            onChange={(event) => update({ accept: event.target.value })}
          />
          <TextArea
            label={t('editor.fields.note')}
            value={draft.note}
            onChange={(event) => update({ note: event.target.value })}
          />
          <TextInput
            label={t('editor.fields.source')}
            value={draft.source}
            onChange={(event) => update({ source: event.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label={t('editor.fields.tags')}
              hint={t('editor.fields.tagsHint')}
              value={draft.tags}
              onChange={(event) => update({ tags: event.target.value })}
            />
            <TextInput
              label={t('editor.fields.checkedAt')}
              type="date"
              value={draft.checkedAt}
              onChange={(event) => update({ checkedAt: event.target.value })}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span id={timeSensitiveId} className="font-display text-base font-extrabold">
              {t('editor.fields.timeSensitive')}
            </span>
            <Toggle
              checked={draft.timeSensitive}
              onChange={(timeSensitive) => update({ timeSensitive })}
              labelledBy={timeSensitiveId}
              onLabel={t('editor.yes')}
              offLabel={t('editor.no')}
            />
          </div>
          <TextArea
            label={t('editor.fields.editorNote')}
            value={draft.editorNote}
            rows={2}
            onChange={(event) => update({ editorNote: event.target.value })}
          />

          <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t-2 border-border bg-bg px-4 py-4 sm:mx-0 sm:px-0">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={busy || !dirty}>
                {busy ? t('editor.edit.saving') : t('editor.edit.save')}
              </Button>
              {STATUS_ACTIONS.filter((a) => a.status !== question.status).map((action) => (
                <Button
                  key={action.status}
                  variant="secondary"
                  size="sm"
                  disabled={busy || (action.status === 'approved' && blockedApproval)}
                  onClick={() => save(action.status)}
                >
                  {t(action.label)}
                </Button>
              ))}
            </div>
            <p role="status" className={message?.ok === false ? 'text-wrong' : 'text-text-muted'}>
              {message?.text ??
                (dirty
                  ? t('editor.edit.unsaved')
                  : blockedApproval && question.status !== 'approved'
                    ? t('editor.edit.approveBlocked')
                    : '')}
            </p>
          </div>
        </form>

        <aside className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <SectionTitle>{t('editor.edit.checks')}</SectionTitle>
            <IssueList issues={issues} empty={t('editor.edit.noIssues')} />
          </section>
          <section className="flex flex-col gap-2">
            <SectionTitle>{t('editor.edit.similar')}</SectionTitle>
            <SimilarList question={question} />
          </section>
          <section className="flex flex-col gap-2">
            <SectionTitle>{t('editor.fields.stats')}</SectionTitle>
            <p>
              {question.shown === 0
                ? t('editor.edit.notPlayed')
                : t('editor.edit.stats', {
                    shown: question.shown,
                    rate: correctRate(question.shown, question.correct),
                  })}
            </p>
          </section>
          {questionReports.length > 0 && (
            <section className="flex flex-col gap-2">
              <SectionTitle>{t('editor.edit.reports')}</SectionTitle>
              <ul className="flex flex-col gap-3">
                {questionReports.map((report) => (
                  <ReportItem key={report.id} report={report} showQuestion={false} />
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
