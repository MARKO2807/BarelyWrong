import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { EDITOR_ROUTES } from '../../app/routes'
import type { QuestionStatus } from '../../data/batchSchema'
import { setStatus } from '../../data/editorApi'
import { hasError, questionIssues } from '../../data/editorChecks'
import { t, tList } from '../../i18n'
import { Button } from '../../ui/Button'
import { IssueList } from '../../ui/editor/IssueList'
import { useEditorData } from './EditorData'
import { errorMessage, SectionTitle, SimilarList } from './parts'

interface Decision {
  id: string
  previous: QuestionStatus
  status: QuestionStatus
}

/**
 * Questions on review one at a time, decided with a key press. The queue is live: a decided
 * question leaves it, so the next one takes its place. `?id=` keeps the place across visits.
 */
export function ReviewPage() {
  const { db, questions, byId, today, patchQuestion } = useEditorData()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [last, setLast] = useState<Decision | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const headingId = useId()

  const queue = useMemo(() => questions.filter((q) => q.status === 'review'), [questions])
  const wanted = params.get('id')
  const wantedIndex = queue.findIndex((q) => q.id === wanted)
  // A decided question is no longer in the queue: stay at the same place, which is now the next one.
  const [lastIndex, setLastIndex] = useState(0)
  const index = wantedIndex >= 0 ? wantedIndex : Math.min(lastIndex, Math.max(queue.length - 1, 0))
  const current = queue[index]

  const issues = useMemo(
    () => (current ? questionIssues(current, questions, today) : []),
    [current, questions, today],
  )

  const goTo = useCallback(
    (next: number) => {
      const target = queue[Math.min(Math.max(next, 0), queue.length - 1)]
      if (!target) return
      setLastIndex(next)
      setParams({ id: target.id }, { replace: true })
    },
    [queue, setParams],
  )

  const decide = useCallback(
    (id: string, previous: QuestionStatus, status: QuestionStatus, remember: boolean) => {
      setBusy(true)
      setError(null)
      setStatus(db, id, status).then(
        () => {
          patchQuestion(id, { status })
          setLast(remember ? { id, previous, status } : null)
          setBusy(false)
          if (remember) {
            // Leave the id behind so the next question in line shows.
            setLastIndex(index)
            setParams({}, { replace: true })
          } else {
            setParams({ id }, { replace: true })
          }
        },
        (e: unknown) => {
          setBusy(false)
          setError(t('editor.saveFailed', { message: errorMessage(e) }))
        },
      )
    },
    [db, index, patchQuestion, setParams],
  )

  const canApprove = current !== undefined && !hasError(issues)
  const act = useCallback(
    (status: QuestionStatus) => {
      if (!current || busy || (status === 'approved' && !canApprove)) return
      decide(current.id, current.status, status, true)
    },
    [current, busy, canApprove, decide],
  )
  const undo = useCallback(() => {
    if (!last || busy) return
    decide(last.id, last.status, last.previous, false)
  }, [last, busy, decide])
  const edit = useCallback(() => {
    if (current) void navigate(`${EDITOR_ROUTES.question(current.id)}?from=pregled`)
  }, [current, navigate])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.target instanceof Element && event.target.closest('input, textarea, select')) return
      const commands: Record<string, () => void> = {
        o: () => act('approved'),
        x: () => act('rejected'),
        a: () => act('archived'),
        e: edit,
        z: undo,
        arrowright: () => goTo(index + 1),
        arrowleft: () => goTo(index - 1),
      }
      const command = commands[event.key.toLowerCase()]
      if (!command) return
      event.preventDefault()
      command()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act, edit, undo, goTo, index])

  const lastQuestion = last ? byId.get(last.id) : undefined

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 id={headingId} className="font-display text-4xl font-extrabold">
          {t('editor.review.title')}
        </h1>
        {current && (
          <p className="font-terminal text-2xl text-text-muted">
            {t('editor.review.progress', { current: index + 1, total: queue.length })}
          </p>
        )}
      </div>

      <div role="status" className="min-h-7">
        {error ? (
          <p className="text-wrong">{error}</p>
        ) : (
          last &&
          lastQuestion && (
            <p className="flex flex-wrap items-center gap-3">
              {t('editor.review.decided', {
                id: last.id,
                status: t(`editor.statuses.${last.status}`),
              })}
              <Button variant="ghost" size="sm" onClick={undo} disabled={busy}>
                {t('editor.actions.undo')} (Z)
              </Button>
            </p>
          )
        )}
      </div>

      {!current ? (
        <p className="text-xl text-text-muted">{t('editor.review.empty')}</p>
      ) : (
        <>
          <article className="flex flex-col gap-4 rounded-lg border-2 border-border bg-surface p-5 sm:p-8">
            <p className="flex flex-wrap gap-x-3 text-text-muted">
              <span className="font-terminal text-xl text-text">{current.id}</span>
              <span>{t(`topics.${current.topic}`)}</span>
              <span>{t(`editor.formats.${current.format}`)}</span>
              <span>{tList('editor.difficulties')[current.difficulty - 1]}</span>
            </p>
            <p className="font-display text-3xl font-extrabold text-balance">{current.question}</p>
            <p className="text-2xl font-semibold text-correct">{current.answer}</p>
            {current.accept.length > 0 && (
              <p className="text-text-muted">
                {t('game.alsoAccepted', { list: current.accept.join(', ') })}
              </p>
            )}
            {current.note && (
              <p className="text-lg">
                <span className="font-semibold">{t('game.note')}:</span> {current.note}
              </p>
            )}
            <div className="flex flex-col gap-1 text-text-muted">
              {current.source && <p>{t('editor.review.source', { source: current.source })}</p>}
              <p>{t('editor.review.origin', { origin: current.origin })}</p>
              {current.tags.length > 0 && <p>{current.tags.join(' · ')}</p>}
              {current.editor_note && (
                <p className="text-text">
                  <span className="font-semibold">{t('editor.fields.editorNote')}:</span>{' '}
                  {current.editor_note}
                </p>
              )}
            </div>
          </article>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="correct"
              disabled={busy || !canApprove}
              onClick={() => act('approved')}
            >
              {t('editor.actions.approve')} (O)
            </Button>
            <Button variant="wrong" disabled={busy} onClick={() => act('rejected')}>
              {t('editor.actions.reject')} (X)
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => act('archived')}>
              {t('editor.actions.archive')} (A)
            </Button>
            <Button variant="ghost" onClick={edit}>
              {t('editor.actions.edit')} (E)
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" disabled={index === 0} onClick={() => goTo(index - 1)}>
                ← {t('editor.actions.previous')}
              </Button>
              <Button
                variant="ghost"
                disabled={index >= queue.length - 1}
                onClick={() => goTo(index + 1)}
              >
                {t('editor.actions.next')} →
              </Button>
            </div>
          </div>
          {!canApprove && <p className="text-wrong">{t('editor.edit.approveBlocked')}</p>}

          <div className="grid gap-6 md:grid-cols-2">
            <section className="flex flex-col gap-2">
              <SectionTitle>{t('editor.review.issues')}</SectionTitle>
              <IssueList issues={issues} empty={t('editor.edit.noIssues')} />
            </section>
            <section className="flex flex-col gap-2">
              <SectionTitle>{t('editor.edit.similar')}</SectionTitle>
              <SimilarList question={current} />
            </section>
          </div>
          <p className="text-sm text-text-muted">{t('editor.review.shortcuts')}</p>
        </>
      )}
    </section>
  )
}
