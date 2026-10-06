import { useId, useState } from 'react'
import { submit } from '../../data/sync'
import { t } from '../../i18n'
import { REPORT_REASONS, type ReportReason } from '../../data/reports'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import { Modal } from '../Modal'
import { FlagIcon } from '../icons'

const COMMENT_MAX = 500

/** Spec 4.9: any question can be reported with a reason; it reaches the editor via the outbox. */
export function ReportQuestion({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton
        label={t('report.button')}
        onClick={() => setOpen(true)}
        className="text-lg text-text-muted"
      >
        <FlagIcon />
      </IconButton>
      <Modal open={open} onClose={() => setOpen(false)} title={t('report.title')}>
        <ReportForm questionId={questionId} onDone={() => setOpen(false)} />
      </Modal>
    </>
  )
}

function ReportForm({ questionId, onDone }: { questionId: string; onDone: () => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)
  const legendId = useId()
  const commentId = useId()

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="status" className="text-xl font-semibold text-correct">
          {t('report.thanks')}
        </p>
        <Button onClick={onDone}>{t('common.close')}</Button>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!reason) return
        submit([{ type: 'report', questionId, reason, comment: comment.trim() || null }])
        setSent(true)
      }}
    >
      <div role="radiogroup" aria-labelledby={legendId} className="flex flex-col gap-2">
        <span id={legendId} className="font-display text-xl font-extrabold">
          {t('report.reason')}
        </span>
        {REPORT_REASONS.map((value) => (
          <label
            key={value}
            className="has-focus-ring flex cursor-pointer items-center gap-3 rounded-md px-2 py-1"
          >
            <input
              type="radio"
              name="reason"
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
              className="size-5 accent-(--primary)"
            />
            {t(`report.reasons.${value}`)}
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={commentId} className="font-display text-lg font-extrabold">
          {t('report.comment')}
        </label>
        <textarea
          id={commentId}
          value={comment}
          maxLength={COMMENT_MAX}
          rows={3}
          onChange={(event) => setComment(event.target.value)}
          className="rounded-md border-2 border-border bg-bg px-3 py-2"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={!reason}>
          {t('report.send')}
        </Button>
      </div>
    </form>
  )
}
